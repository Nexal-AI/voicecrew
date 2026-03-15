/**
 * Shared error class for all Voicecrew providers (TTS, STT, LLM).
 *
 * Using a typed error class (rather than plain Error + message strings) lets
 * callers distinguish failure modes programmatically without fragile
 * string-matching on error messages.
 *
 * @example
 * ```ts
 * try {
 *   await tts.synthesize(text);
 * } catch (err) {
 *   if (err instanceof ProviderError) {
 *     switch (err.code) {
 *       case 'TIMEOUT':        // retry with a longer timeout
 *       case 'CONFIG_MISSING': // log and alert the user to set their API key
 *       case 'API_ERROR':      // inspect err.statusCode for rate-limit vs server error
 *     }
 *   }
 * }
 * ```
 */

export type ProviderErrorCode =
  /** Request exceeded the configured timeout window. */
  | 'TIMEOUT'
  /** Network-level failure (DNS, connection refused, etc.). */
  | 'NETWORK_ERROR'
  /** The API returned a non-2xx HTTP status code. */
  | 'API_ERROR'
  /** A required configuration value is missing (e.g. API key). */
  | 'CONFIG_MISSING'
  /** The input (text, audio, messages) was invalid (empty, wrong type, etc.). */
  | 'INVALID_INPUT'
  /** The provider returned an empty or null response. */
  | 'EMPTY_RESPONSE'
  /** The provider returned a truncated or incomplete response (e.g., hit token limit). */
  | 'TRUNCATED_RESPONSE'
  /** Generic unknown error when a more specific code doesn't apply. */
  | 'UNKNOWN';

export class ProviderError extends Error {
  /** Machine-readable error code — use this for programmatic handling. */
  readonly code: ProviderErrorCode;

  /**
   * HTTP status code, if the error originated from an API response.
   * Undefined for network errors, timeouts, and validation errors.
   */
  readonly statusCode: number | undefined;

  /**
   * The underlying cause, if this error wraps another.
   * Mirrors the standard `Error.cause` pattern.
   */
  override readonly cause?: unknown;

  /**
   * The provider type that threw the error (tts, stt, llm).
   * Useful for logging and debugging multi-provider setups.
   */
  readonly providerType?: string;

  /**
   * The provider name that threw the error (e.g., 'openai', 'deepgram', 'kokoro').
   * Useful for logging and debugging multi-provider setups.
   */
  readonly providerName?: string;

  constructor(
    code: ProviderErrorCode,
    message: string,
    options?: {
      statusCode?: number;
      cause?: unknown;
      providerType?: string;
      providerName?: string;
    }
  ) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    this.statusCode = options?.statusCode;
    this.cause = options?.cause;
    this.providerType = options?.providerType;
    this.providerName = options?.providerName;

    // Maintain correct prototype chain for `instanceof` checks in transpiled output.
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Indicates whether this error is generally safe to retry.
   * 
   * Returns `true` for:
   * - TIMEOUT errors (may succeed on retry)
   * - NETWORK_ERROR (transient connection issues)
   * - API_ERROR with status codes 429 (rate limit), 500, 502, 503, 504 (server errors)
   * 
   * Returns `false` for:
   * - CONFIG_MISSING (retry won't help — user needs to fix config)
   * - INVALID_INPUT (retry won't fix invalid input)
   * - EMPTY_RESPONSE, TRUNCATED_RESPONSE (usually logic errors, not transient)
   */
  get isRetryable(): boolean {
    return (
      this.code === 'TIMEOUT' ||
      this.code === 'NETWORK_ERROR' ||
      (this.code === 'API_ERROR' &&
        this.statusCode !== undefined &&
        RETRYABLE_STATUS_CODES.has(this.statusCode))
    );
  }

  /**
   * Convenience getter to check if this was an authentication/configuration error.
   * These errors typically require user intervention rather than retry logic.
   */
  get isAuthError(): boolean {
    return (
      this.code === 'CONFIG_MISSING' ||
      (this.code === 'API_ERROR' &&
        this.statusCode !== undefined &&
        AUTH_ERROR_STATUS_CODES.has(this.statusCode))
    );
  }
}

/** HTTP status codes that indicate a transient server-side failure worth retrying. */
export const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

/** HTTP status codes that indicate authentication or authorization failures. */
export const AUTH_ERROR_STATUS_CODES = new Set([401, 403]);

/**
 * Convenience function to create a ProviderError from an unknown error.
 * Wraps unexpected errors in a typed ProviderError for consistent handling.
 *
 * @example
 * ```ts
 * try {
 *   await someOperation();
 * } catch (err) {
 *   throw ProviderError.from(err, 'NETWORK_ERROR', 'Failed to connect to API');
 * }
 * ```
 */
export function providerErrorFrom(
  error: unknown,
  defaultCode: ProviderErrorCode = 'UNKNOWN',
  defaultMessage: string = 'An unknown error occurred'
): ProviderError {
  if (error instanceof ProviderError) {
    return error;
  }

  const message = error instanceof Error ? error.message : defaultMessage;
  const cause = error;

  return new ProviderError(defaultCode, message, { cause });
}
