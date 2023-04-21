import {
  Agent,
  Debug,
  TCPClient,
  TCPEvents,
  TCPServer,
} from "./dependencies.ts";
import { ConnectionAlreadyOpen, PortalAgentClosed } from "./exceptions.ts";

export default class PortalAgent extends Agent {
  availableSockets: WebSocket[];
  connectionQueue: Function[];
  debugLog: Debug;
  server: TCPServer;
  connectedSockets = 0;
  /** Flag to avoid double starts */
  started = false;
  /** Flag to avoid double starts */
  closed = false;
  destroyed = false;

  constructor(
    readonly port: number,
    readonly subdomain: string,
    readonly maxSockets: number,
  ) {
    super({
      keepAlive: true,
      /* prevent keepAlive from holding on to all the
      sockets so they can be used for upgrades */
      maxFreeSockets: 1,
    });

    this.availableSockets = [];
    this.connectionQueue = [];
    this.debugLog = Debug(`quin:TunnelAgent[${subdomain}][${port}]`);
    this.server = new TCPServer();
  }

  listen() {
    if (this.started) {
      throw new ConnectionAlreadyOpen();
    }
    this.started = true;

    this.server.events.on(TCPEvents.DISCONNECT, this.onDisconnect.bind(this));
    this.server.events.on(TCPEvents.CONNECT, this.onConnect.bind(this));
    this.server.events.on(TCPEvents.ERROR, this.onError.bind(this));

    this.server.listen("0.0.0.0", this.port);
    this.server.start();
    this.debugLog("TCP Server listening");

    return { port: this.port };
  }

  createConnection(onAvailableCallback: (socket: WebSocket | null) => void) {
    if (this.closed) {
      onAvailableCallback(null);
    }

    this.debugLog("creating connection");
    const socket = this.availableSockets.shift();
    if (!socket) {
      this.debugLog("connection queued");
      this.connectionQueue.push(onAvailableCallback);
    } else {
      this.debugLog("socket given");
      onAvailableCallback(socket);
    }
  }

  destroy() {
    if (!this.destroyed) {
      this.server.close();
      this.destroyed = true;
    }
    super.destroy();
  }

  private onDisconnect() {
    // TODO: Are DISCONNECT and CLOSE events different?
    this.closed = true;
    this.debugLog("TCP Server disconnected");
    for (const conn of this.connectionQueue) {
      conn(new Error("closed"), null);
    }
    this.connectionQueue = [];
    // TODO: this.emit("end");
  }

  private onConnect(socket: TCPClient) {
  }

  private onError(error: Error) {
    // These errors happen from killed
    // connections, we don't worry about them
    this.debugLog(error);
  }
}
