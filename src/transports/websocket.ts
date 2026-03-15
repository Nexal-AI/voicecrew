import { BaseTransport } from './base.js';
import type { TransportConfig } from '../types.js';

export interface WebSocketConfig extends TransportConfig {
  port?: number;
  host?: string;
}

export class WebSocketTransport extends BaseTransport {
  override readonly name = 'websocket';
  private port: number;
  private host: string;
  private clients: Set<unknown> = new Set();
  private connectionHandlers: Array<(client: unknown) => void> = [];
  private disconnectionHandlers: Array<(client: unknown) => void> = [];

  constructor(config: WebSocketConfig = {}) {
    super(config);
    this.port = config.port ?? 3000;
    this.host = config.host ?? 'localhost';
  }

  override async connect(): Promise<void> {
    this.isRunning = true;
    // Mock implementation - in real version would start WebSocket server
  }

  override async disconnect(): Promise<void> {
    this.isRunning = false;
    this.clients.clear();
    // Mock implementation - in real version would stop WebSocket server
  }

  override broadcast(event: string, data: unknown): void {
    if (!this.isRunning) {
      throw new Error('Transport is not running');
    }
    // Mock implementation - in real version would broadcast to all clients
  }

  override onConnection(handler: (client: unknown) => void): void {
    this.connectionHandlers.push(handler);
  }

  override onDisconnection(handler: (client: unknown) => void): void {
    this.disconnectionHandlers.push(handler);
  }

  getPort(): number {
    return this.port;
  }

  getHost(): string {
    return this.host;
  }

  getClientCount(): number {
    return this.clients.size;
  }
}
