import { Debug, http, net, stream } from "./dependencies.ts";
import { ConnectionAlreadyOpen, PortalClosed } from "./exceptions.ts";
import ConnectionCallback from "./types/connectionCallback.ts";

export default class Agent extends http.Agent {
  /**
   * A socket is a tcp connection back to the user hosting the site
   */
  availableSockets: stream.Duplex[] = [];

  connectedSockets = 0;

  debug: Debug;

  /** TCP server to service requests for this portal */
  server: net.Server;

  /**
   * When a `createConnection` cannot return a socket, it goes into this queue
   * once a socket is available it is handed out to the next callback
   */
  connectionQueue: ConnectionCallback[] = [];

  /** Flag to avoid double triggers */
  started = false;

  /** Flag to avoid double triggers */
  closed = false;

  /** Flag to avoid double triggers */
  destroyed = false;

  constructor(
    readonly port: number,
    readonly subdomain: string,
    readonly maxSockets: number,
  ) {
    super({
      keepAlive: true,
      // only allow keepalive to hold on to one socket
      // this prevents it from holding on to all the
      // sockets so they can be used for upgrades
      maxFreeSockets: 1,
    });

    this.debug = Debug(`quicknexus.agent[${subdomain}]`);

    this.server = net.createServer();
  }

  listen() {
    if (this.started) throw new ConnectionAlreadyOpen();
    this.started = true;

    this.server.on("close", this.onClose.bind(this));
    this.server.on("connection", this.onConnection.bind(this));
    this.server.on("error", this.onError.bind(this));

    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        this.debug(`TCP server listening on port: ${this.port}`);
        resolve({ port: this.port });
      });
    });
  }

  createConnection(callback: ConnectionCallback) {
    if (this.closed) {
      callback(new PortalClosed(), null);
      return;
    }

    this.debug("creating connection");

    // get socket or enqueue the connection
    {
      const socket = this.availableSockets.shift();
      if (socket) {
        this.debug("socket given");
        callback(null, socket);
      } else { // no available sockets, enqueue the connection
        this.connectionQueue.push(callback);
        this.debug("connection queued");
        this.debug(` - connected sockets: ${this.connectedSockets}`);
        this.debug(` - available sockets: ${this.availableSockets.length}`);
      }
    }
  }

  onConnection(socket: net.Socket): void {
    // too many connections
    if (this.connectedSockets >= this.maxSockets) {
      this.debug("no more sockets allowed");
      socket.destroy();
    }

    socket.once("close", (hadError: boolean) => {
      this.debug(`closed socket ${hadError ? ("due to error") : ""}`);

      // remove the socket from `availableSockets`
      {
        this.connectedSockets -= 1;
        const idx = this.availableSockets.indexOf(socket);
        if (idx >= 0) {
          this.availableSockets.splice(idx, 1);
        }
      }

      this.debug(`connected sockets: ${this.connectedSockets}`);

      if (this.connectedSockets <= 0) {
        this.debug("all sockets disconnected");
        this.emit("offline");
      }
    });

    socket.once("error", (_error: Error) => {
      // sessions can drop from portals for many reasons
      // these are not actionable errors for our nexus
      socket.destroy();
    });

    if (this.connectedSockets === 0) this.emit("online");

    this.connectedSockets += 1;
    this.debug(`new connection from: ${socket.address()}`);

    // provide socket to `connectionQueue` or push to `availableSockets`
    {
      const callback = this.connectionQueue.shift();
      if (callback) { // if there are queued connections, give this socket now
        this.debug("giving socket to queued connection request");
        setTimeout(() => callback(null, socket), 0);
      } else { // make socket available for those waiting on sockets
        this.availableSockets.push(socket);
      }
    }
  }

  private onClose() {
    this.closed = true;
    this.debug("socket closed");

    // flush any waiting connections
    for (const callback of this.connectionQueue) {
      callback(new PortalClosed(), null);
    }

    this.connectionQueue = [];

    this.emit("end");
  }

  private onError(error: Error) {
    // These errors happen from killed
    // connections, we don't worry about them
    this.debug(error);
  }

  destroy() {
    this.server.close();
    super.destroy();
  }
}
