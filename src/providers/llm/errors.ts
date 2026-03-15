/**
 * Typed error codes for LLM provider failures.
 *
 * Using a typed error class (rather than plain Error + message strings) lets
 * callers distinguish failure modes programmatically without fragile
 * string-matching on error messages.
 *
 * @example
 * ```ts
 * try {
 *   await llm.chat(messages);
 * } catch (err) {
 *   if (err instanceof LLMError) {
 *     switch (err.code) {
 *       case 'TIMEOUT':       // retry with a longer timeout
 *       case 'EMPTY_RESPONSE': // log and skip turn
 *       case 'API_ERROR':      // inspect err.statusCode for rate-limit vs server error
 *     }
 *   }
 * }
 * ```
 */

export type LLMErrorCode =
  /** Request exceeded the configured timeout window. */
  | 'TIMEOUT'
  /** Network-level failure (DNS, connection refused, etc.). */
  | 'NETWORK_ERROR'
  /** The API returned a non-2xx HTTP status code. */
  | 'API_ERROR'
  /** The API response contained no choices array or an empty choices array. */
  | 'NO_CHOICES'
  /** A choice was returned but its message.content was null or undefined. */
  | 'NULL_CONTENT'
  /** A choice was returned but its message.content was an empty/whitespace string. */
  | 'EMPTY_RESPONSE'
  /** The response was truncated because the model hit the token limit (finish_reason=length). */
  | 'TRUNCATED_RESPONSE'
  /** A required configuration value is missing (e.g. API key). */
  | 'MISSING_CONFIG'
  /** The input prompt or messages list was invalid (empty, wrong type, etc.). */
  | 'INVALID_INPUT';

export class LLMError extends Error {
  /** Machine-readable error code — use this for programmatic handling. */
  readonly code: LLMErrorCode;

  /**
   * HTTP status code, if the error originated from an API response.
   * Undefined for network errors, timeouts, and validation errors.
   */
  readonly statusCode?: number;

  /**
   * The underlying cause, if this error wraps another.
   * Mirrors the standard `Error.cause` pattern.
   */
  override readonly cause?: unknown;

  constructor(
    code: LLMErrorCode,
    message: string,
    options?: { statusCode?: number; cause?: unknown }
  ) {
    super(message);
    this.name = 'LLMError';
    this.code = code;
    this.statusCode = options?.statusCode;
    this.cause = options?.cause;

    // Maintain correct prototype chain for `instanceof` checks in transpiled output.
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /** Convenience: returns true for codes that are generally safe to retry. */
  get isRetryable(): boolean {
    return (
      this.code === 'TIMEOUT' ||
      this.code === 'NETWORK_ERROR' ||
      (this.code === 'API_ERROR' &&
        this.statusCode !== undefined &&
        RETRYABLE_STATUS_CODES.has(this.statusCode))
    );
  }
}

/** HTTP status codes that indicate a transient server-side failure worth retrying. */
export const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
