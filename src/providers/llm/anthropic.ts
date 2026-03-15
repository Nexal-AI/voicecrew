import { BaseLLMProvider } from './base.js';
import { LLMError, RETRYABLE_STATUS_CODES } from './errors.js';
import type { LLMConfig, LLMMessage } from '../../types.js';

export interface AnthropicLLMConfig extends LLMConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  baseURL?: string;
  /** Request timeout in milliseconds. Defaults to 30000 (30s). */
  timeoutMs?: number;
  /**
   * Number of retries on transient errors (timeouts, network failures, 5xx responses).
   * Defaults to 2. Set to 0 to disable retries entirely.
   *
   * Retries use exponential backoff: 200ms, 400ms, 800ms, …
   */
  maxRetries?: number;
}

// ---------------------------------------------------------------------------
// Provider compatibility notes
// ---------------------------------------------------------------------------
//
// This provider uses the official Anthropic SDK and supports all Claude models.
//
// Key differences from OpenAI:
//   • max_tokens is required in Anthropic API (not optional)
//   • system prompts are passed as a separate top-level parameter, not as
//     a message with role='system'
//   • temperature defaults to 1.0 (Anthropic default), range is 0-1
//   • model names follow Anthropic's naming convention:
//     - claude-3-opus-20240229
//     - claude-3-sonnet-20240229
//     - claude-3-haiku-20240307
//     - claude-3-5-sonnet-20240620
//     - etc.
//
// ---------------------------------------------------------------------------

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicChatResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string | null;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

/** Exponential backoff delay: 200ms, 400ms, 800ms, … */
function retryDelay(attempt: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 200 * Math.pow(2, attempt)));
}

export class AnthropicLLM extends BaseLLMProvider {
  readonly name = 'anthropic';
  private apiKey: string | undefined;
  private model: string;
  private temperature: number;
  private maxTokens: number;
  private baseURL: string;
  private timeoutMs: number;
  private maxRetries: number;

  constructor(config: AnthropicLLMConfig = {}) {
    super(config);
    this.apiKey = config.apiKey ?? process.env.ANTHROPIC_API_KEY;
    this.model = config.model ?? 'claude-3-haiku-20240307';
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens ?? 1024;
    this.baseURL = config.baseURL ?? 'https://api.anthropic.com/v1';
    this.timeoutMs = config.timeoutMs ?? 30_000;
    this.maxRetries = config.maxRetries ?? 2;
  }

  async complete(prompt: string, options?: LLMConfig): Promise<string> {
    if (!prompt || prompt.trim().length === 0) {
      throw new LLMError('INVALID_INPUT', 'Prompt cannot be empty');
    }
    return this.chat([{ role: 'user', content: prompt }], options);
  }

  async chat(messages: LLMMessage[], options?: LLMConfig): Promise<string> {
    if (!this.apiKey) {
      throw new LLMError(
        'MISSING_CONFIG',
        'Anthropic API key is required. Pass it via the apiKey config option or set the ANTHROPIC_API_KEY environment variable.',
      );
    }
    if (!messages || messages.length === 0) {
      throw new LLMError('INVALID_INPUT', 'Messages cannot be empty');
    }

    const model = options?.model ?? this.model;
    const temperature = (options?.temperature as number | undefined) ?? this.temperature;
    const maxTokens = options?.maxTokens ?? this.maxTokens;

    // Separate system messages from conversation messages
    // Anthropic requires system prompts as a separate parameter
    const systemMessages = messages.filter((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    const systemPrompt = systemMessages.map((m) => m.content).join('\n\n') || undefined;

    // Convert to Anthropic message format (only user/assistant roles)
    const anthropicMessages: AnthropicMessage[] = conversationMessages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

    const requestBody: Record<string, unknown> = {
      model,
      messages: anthropicMessages,
      temperature,
      max_tokens: maxTokens,
    };

    // Only include system if it's not empty
    if (systemPrompt && systemPrompt.trim().length > 0) {
      requestBody.system = systemPrompt;
    }

    const body = JSON.stringify(requestBody);

    let lastError: LLMError | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        await retryDelay(attempt - 1);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      let response: Response;
      try {
        response = await fetch(`${this.baseURL}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body,
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timeoutId);
        const isTimeout = err instanceof Error && err.name === 'AbortError';

        lastError = isTimeout
          ? new LLMError('TIMEOUT', `Anthropic API request timed out after ${this.timeoutMs}ms`, {
              cause: err,
            })
          : new LLMError(
              'NETWORK_ERROR',
              `Anthropic API network error: ${err instanceof Error ? err.message : String(err)}`,
              { cause: err },
            );

        if (attempt < this.maxRetries) continue;
        throw lastError;
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        lastError = new LLMError(
          'API_ERROR',
          `Anthropic API request failed with status ${response.status}: ${errorText}`,
          { statusCode: response.status },
        );

        if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < this.maxRetries) {
          continue;
        }
        throw lastError;
      }

      const data = (await response.json()) as AnthropicChatResponse;

      // Check for content
      const contentBlock = data.content?.[0];
      if (!contentBlock) {
        throw new LLMError('NO_CHOICES', 'Anthropic API returned no content in response');
      }

      // Warn on truncated responses — content may be cut off mid-sentence.
      // We still return the (partial) content so callers can decide how to handle it.
      if (data.stop_reason === 'max_tokens') {
        console.warn(
          `[AnthropicLLM] Response was truncated (stop_reason=max_tokens). ` +
            `Consider increasing maxTokens (currently ${maxTokens}).`,
        );
      }

      const content = contentBlock.text;
      if (content === undefined || content === null) {
        throw new LLMError(
          'NULL_CONTENT',
          'Anthropic API returned a content block with no text (null/undefined)',
        );
      }
      if (content.trim().length === 0) {
        throw new LLMError('EMPTY_RESPONSE', 'Anthropic API returned an empty content string');
      }

      return content;
    }

    // Should be unreachable, but satisfies TypeScript
    throw lastError ?? new LLMError('API_ERROR', 'Anthropic API request failed after all retries');
  }

  getModel(): string {
    return this.model;
  }

  getBaseURL(): string {
    return this.baseURL;
  }
}
