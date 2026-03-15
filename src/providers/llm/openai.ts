import { BaseLLMProvider } from './base.js';
import { LLMError, RETRYABLE_STATUS_CODES } from './errors.js';
import type { LLMConfig, LLMMessage } from '../../types.js';

export interface OpenAILLMConfig extends LLMConfig {
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
// This provider is OpenAI-compatible and works with any API that follows the
// /v1/chat/completions contract (e.g. Groq, Together AI, Ollama, Mistral AI,
// local llama.cpp servers, etc.).
//
// Common differences to watch out for:
//
//   • max_tokens vs max_new_tokens — Some providers (especially HuggingFace-
//     based ones) use `max_new_tokens` instead of `max_tokens`. If responses
//     are being cut short unexpectedly, check your provider's API docs.
//
//   • temperature range — Most providers use 0–2 (OpenAI default). Some use
//     0–1. Values outside the accepted range will return a 400 error.
//
//   • model names — Provider-specific. Always pass `model` explicitly when
//     using a non-OpenAI provider.
//
//   • Authentication — Some self-hosted providers (Ollama) ignore the
//     Authorization header; others require a different scheme. Set apiKey to
//     a placeholder string (e.g. 'none') to satisfy the key-presence check.
//
// Future: a `requestTransform` hook is planned to allow field remapping for
// providers with non-standard request shapes (e.g. max_new_tokens renaming).
// ---------------------------------------------------------------------------

interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIChatResponse {
  choices: Array<{
    message: {
      role: string;
      content: string | null;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** Exponential backoff delay: 200ms, 400ms, 800ms, … */
function retryDelay(attempt: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 200 * Math.pow(2, attempt)));
}

export class OpenAILLM extends BaseLLMProvider {
  readonly name = 'openai';
  private apiKey: string | undefined;
  private model: string;
  private temperature: number;
  private maxTokens: number;
  private baseURL: string;
  private timeoutMs: number;
  private maxRetries: number;

  constructor(config: OpenAILLMConfig = {}) {
    super(config);
    this.apiKey = config.apiKey ?? process.env.OPENAI_API_KEY;
    this.model = config.model ?? 'gpt-4o-mini';
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens ?? 1024;
    this.baseURL = config.baseURL ?? process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
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
        'OpenAI API key is required. Pass it via the apiKey config option or set the OPENAI_API_KEY environment variable.'
      );
    }
    if (!messages || messages.length === 0) {
      throw new LLMError('INVALID_INPUT', 'Messages cannot be empty');
    }

    const model = (options?.model as string | undefined) ?? this.model;
    const temperature = (options?.temperature as number | undefined) ?? this.temperature;
    const maxTokens = (options?.maxTokens as number | undefined) ?? this.maxTokens;

    const body = JSON.stringify({
      model,
      messages: messages as OpenAIChatMessage[],
      temperature,
      max_tokens: maxTokens,
    });

    let lastError: LLMError | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        await retryDelay(attempt - 1);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      let response: Response;
      try {
        response = await fetch(`${this.baseURL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body,
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timeoutId);
        const isTimeout = err instanceof Error && err.name === 'AbortError';

        lastError = isTimeout
          ? new LLMError(
              'TIMEOUT',
              `OpenAI API request timed out after ${this.timeoutMs}ms`,
              { cause: err }
            )
          : new LLMError(
              'NETWORK_ERROR',
              `OpenAI API network error: ${err instanceof Error ? err.message : String(err)}`,
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
          `OpenAI API request failed with status ${response.status}: ${errorText}`,
          { statusCode: response.status }
        );

        if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < this.maxRetries) {
          continue;
        }
        throw lastError;
      }

      const data = (await response.json()) as OpenAIChatResponse;

      const choice = data.choices?.[0];
      if (!choice) {
        throw new LLMError('NO_CHOICES', 'OpenAI API returned no choices in response');
      }

      // Warn on truncated responses — content may be cut off mid-sentence.
      // We still return the (partial) content so callers can decide how to handle it.
      if (choice.finish_reason === 'length') {
        console.warn(
          `[OpenAILLM] Response was truncated (finish_reason=length). ` +
            `Consider increasing maxTokens (currently ${maxTokens}).`
        );
      }

      const content = choice.message?.content;
      if (content === undefined || content === null) {
        throw new LLMError(
          'NULL_CONTENT',
          'OpenAI API returned a choice with no message content (null/undefined)'
        );
      }
      if (content.trim().length === 0) {
        throw new LLMError(
          'EMPTY_RESPONSE',
          'OpenAI API returned an empty content string'
        );
      }

      return content;
    }

    // Should be unreachable, but satisfies TypeScript
    throw lastError ?? new LLMError('API_ERROR', 'OpenAI API request failed after all retries');
  }

  getModel(): string {
    return this.model;
  }

  getBaseURL(): string {
    return this.baseURL;
  }
}
