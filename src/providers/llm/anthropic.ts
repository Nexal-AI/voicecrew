import { BaseLLMProvider } from './base.js';
import { LLMError, RETRYABLE_STATUS_CODES } from './errors.js';
import type { LLMConfig, LLMMessage } from '../../types.js';

export interface AnthropicLLMConfig extends LLMConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** Request timeout in milliseconds. Defaults to 30000 (30s). */
  timeoutMs?: number;
  /**
   * Number of retries on transient errors (timeouts, network failures, 5xx responses).
   * Defaults to 2. Set to 0 to disable retries entirely.
   */
  maxRetries?: number;
}

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicChatResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence';
  usage: {
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
  private timeoutMs: number;
  private maxRetries: number;

  constructor(config: AnthropicLLMConfig = {}) {
    super(config);
    this.apiKey = config.apiKey ?? process.env.ANTHROPIC_API_KEY;
    this.model = config.model ?? 'claude-3-5-sonnet-20241022';
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens ?? 1024;
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
        'Anthropic API key is required. Pass it via the apiKey config option or set the ANTHROPIC_API_KEY environment variable.'
      );
    }
    if (!messages || messages.length === 0) {
      throw new LLMError('INVALID_INPUT', 'Messages cannot be empty');
    }

    const model = (options?.model as string | undefined) ?? this.model;
    const temperature = (options?.temperature as number | undefined) ?? this.temperature;
    const maxTokens = (options?.maxTokens as number | undefined) ?? this.maxTokens;

    // Extract system message if present
    const systemMessage = messages.find((m) => m.role === 'system');
    const chatMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const body: Record<string, unknown> = {
      model,
      messages: chatMessages as AnthropicMessage[],
      temperature,
      max_tokens: maxTokens,
    };

    if (systemMessage) {
      body.system = systemMessage.content;
    }

    let lastError: LLMError | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        await retryDelay(attempt - 1);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      let response: Response;
      try {
        response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timeoutId);
        const isTimeout = err instanceof Error && err.name === 'AbortError';

        lastError = isTimeout
          ? new LLMError(
              'TIMEOUT',
              `Anthropic API request timed out after ${this.timeoutMs}ms`,
              { cause: err }
            )
          : new LLMError(
              'NETWORK_ERROR',
              `Anthropic API network error: ${err instanceof Error ? err.message : String(err)}`,
              { cause: err }
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
          { statusCode: response.status }
        );

        if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < this.maxRetries) {
          continue;
        }
        throw lastError;
      }

      const data = (await response.json()) as AnthropicChatResponse;

      if (!data.content || data.content.length === 0) {
        throw new LLMError('NO_CHOICES', 'Anthropic API returned no content in response');
      }

      const content = data.content[0]?.text;

      if (content === undefined || content === null) {
        throw new LLMError(
          'NULL_CONTENT',
          'Anthropic API returned a choice with no message content (null/undefined)'
        );
      }
      if (content.trim().length === 0) {
        throw new LLMError(
          'EMPTY_RESPONSE',
          'Anthropic API returned an empty content string'
        );
      }

      return content;
    }

    // Should be unreachable, but satisfies TypeScript
    throw lastError ?? new LLMError('API_ERROR', 'Anthropic API request failed after all retries');
  }

  getModel(): string {
    return this.model;
  }
}
