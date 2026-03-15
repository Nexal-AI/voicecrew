import type { Transport, TransportConfig } from '../types.js';

/**
 * Abstract base class for all transport implementations.
 * Provides common functionality and defines the interface that concrete transports must implement.
 *
 * @abstract
 * @example
 * ```typescript
 * class MyTransport extends BaseTransport {
 *   readonly name = 'my-transport';
 *
 *   async connect(): Promise<void> {
 *     // Implementation
 *   }
 *
 *   async disconnect(): Promise<void> {
 *     // Implementation
 *   }
 *
 *   broadcast(event: string, data: unknown): void {
 *     // Implementation
 *   }
 * }
 * ```
 */
export abstract class BaseTransport implements Transport {
  /** @abstract The unique name identifier for this transport */
  abstract readonly name: string;

  /** The transport configuration */
  protected config: TransportConfig;

  /** Whether the transport is currently running */
  protected isRunning: boolean = false;

  /**
   * Creates a new BaseTransport instance.
   *
   * @param config - The transport configuration options
   */
  constructor(config: TransportConfig = {}) {
    this.config = config;
  }

  /**
   * Gets the current running state of the transport.
   * @returns True if the transport is running, false otherwise
   */
  get running(): boolean {
    return this.isRunning;
  }

  /**
   * Connects/starts the transport and begins accepting connections.
   *
   * @abstract
   * @returns A promise that resolves when the transport is started
   */
  abstract connect(): Promise<void>;

  /**
   * Disconnects/stops the transport and closes all connections.
   *
   * @abstract
   * @returns A promise that resolves when the transport is stopped
   */
  abstract disconnect(): Promise<void>;

  /**
   * Broadcasts an event with data to all connected clients.
   *
   * @abstract
   * @param event - The event name to broadcast
   * @param data - The data to send with the event
   */
  abstract broadcast(event: string, data: unknown): void;

  /**
   * Registers a handler for new client connections.
   * Optional method that transports may implement.
   *
   * @param handler - Callback function invoked when a client connects
   */
  onConnection?(handler: (client: unknown) => void): void;

  /**
   * Registers a handler for client disconnections.
   * Optional method that transports may implement.
   *
   * @param handler - Callback function invoked when a client disconnects
   */
  onDisconnection?(handler: (client: unknown) => void): void;
}

export { type Transport, type TransportConfig };
