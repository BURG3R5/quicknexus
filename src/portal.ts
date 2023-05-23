import Agent from "./agent.ts";
import { Debug, EventEmitter, http, pump, stream } from "./dependencies.ts";

export default class Portal extends EventEmitter {
  connectedSockets: number;
  private debug: Debug;
  agent: Agent;

  /**
   * Portal is given a grace period in which user
   * can re-connect before they are _removed_
   */
  private graceTimeout: number;

  constructor(
    readonly port: number,
    readonly subdomain: string,
    maxSockets: number,
  ) {
    super();

    this.connectedSockets = 0;
    this.debug = Debug(`quicknexus.portal[${this.subdomain}][${this.port}]`);
    this.graceTimeout = setTimeout(() => this.close(), 1000);

    // init Agent
    {
      this.agent = new Agent(port, subdomain, maxSockets);

      this.agent.on("online", () => {
        this.debug("client online %s", subdomain);
        clearTimeout(this.graceTimeout);
      });

      this.agent.on("offline", () => {
        this.debug("client offline %s", subdomain);

        // if there was a previous timeout set, we don't want to double trigger
        clearTimeout(this.graceTimeout);
        this.graceTimeout = setTimeout(() => this.close(), 1000);
      });

      this.agent.once("error", () => this.close());
    }
  }

  close() {
    clearTimeout(this.graceTimeout);
    this.agent.destroy();
    this.emit("close");
  }

  handleRequest(
    requestToNexus: http.IncomingMessage,
    responseFromNexus: http.ServerResponse,
  ) {
    this.debug(`> ${requestToNexus.url}`);
    const requestToClient = http.request(
      {
        path: requestToNexus.url,
        agent: this.agent,
        method: requestToNexus.method,
        headers: requestToNexus.headers,
      },
      (responseFromPortal: http.IncomingMessage) => {
        this.debug(`< ${requestToNexus.url}`);
        responseFromNexus.writeHead(
          responseFromPortal.statusCode || 0,
          responseFromPortal.headers,
        );

        // using pump is deliberate - see the pump docs for why
        pump(responseFromPortal, responseFromNexus);
      },
    );

    requestToClient.once("error", (error: Error) => {
      responseFromNexus.statusCode = 500;
      responseFromNexus.end({
        message: "Internal Server Error",
        details: error.message,
        ok: false,
      });
      return;
    });

    // using pump is deliberate - see the pump docs for why
    pump(requestToNexus, requestToClient);
  }

  handleUpgrade(request: http.IncomingMessage, nexusSocket: stream.Duplex) {
    this.debug(`> [upgrade] ${request.url}`);
    nexusSocket.once("error", (err) => console.error(err));

    this.agent.createConnection(
      {},
      (err: Error | undefined, portalSocket: stream.Duplex) => {
        this.debug(`< [upgrade] ${request.url}`);

        // disconnect if error when getting a connection
        if (err) {
          nexusSocket.end();
          return;
        }

        // ensure socket is still connected
        if (!nexusSocket.readable || !nexusSocket.writable) {
          portalSocket.destroy();
          nexusSocket.end();
          return;
        }

        // construct rawData
        const rawData: string[] = [];
        {
          // Websocket requests are special in that we simply
          // re-create the header info then directly pipe the
          // socket data. Avoids having to rebuild the request
          // and handle upgrades via the http client

          rawData.push(
            `${request.method} ${request.url} HTTP/${request.httpVersion}`,
          );

          for (let i = 0; i < request.rawHeaders.length - 1; i += 2) {
            rawData.push(
              `${request.rawHeaders[i]}: ${request.rawHeaders[i + 1]}`,
            );
          }

          rawData.push("");
          rawData.push("");
        }

        // using pump is deliberate - see the pump docs for why
        pump(portalSocket, nexusSocket);
        pump(nexusSocket, portalSocket);
        portalSocket.write(rawData.join("\r\n"));
      },
    );
  }
}
