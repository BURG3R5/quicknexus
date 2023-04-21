import PortalAgent from "./agent.ts";
import { axios as request, copyN, Debug } from "./dependencies.ts";
import { castDenoHeadersToAxios, castResponse } from "./utils.ts";

export default class Portal {
  agent: PortalAgent;
  connectedSockets: number;
  private debugLog: Debug;

  /**
   * Portal is given a grace period in which user
   * can re-connect before they are _removed_
   */
  private graceTimeout: number;

  constructor(
    readonly port: number,
    readonly subdomain: string,
    readonly onCloseCallback: (subdomain: string) => void,
    maxSockets: number,
  ) {
    this.agent = new PortalAgent(port, subdomain, maxSockets);
    this.connectedSockets = 0;
    this.debugLog = Debug(`quicknexus:Portal[${this.subdomain}][${this.port}]`);
    this.graceTimeout = setTimeout(() => this.close(), 1000);

    this.agent.on("online", () => {
      this.debugLog("client active");
      clearTimeout(this.graceTimeout);
    });

    this.agent.on("offline", () => {
      this.debugLog("portal closed");

      clearTimeout(this.graceTimeout);
      this.graceTimeout = setTimeout(() => this.close(), 1000);
    });
  }

  close() {
    clearTimeout(this.graceTimeout);
    this.agent.destroy();
    this.onCloseCallback(this.subdomain);
  }

  async handleRequest(requestToNexus: Request): Promise<Response> {
    this.debugLog(`> ${requestToNexus.url}`);

    const responseFromPortal = await request(requestToNexus.url, {
      httpAgent: this.agent,
      method: requestToNexus.method,
      headers: castDenoHeadersToAxios(requestToNexus.headers),
    });

    this.debugLog(`< ${requestToNexus.url}`);

    return castResponse(responseFromPortal);
  }

  handleUpgrade(request: Request, socket: WebSocket) {
    this.debugLog(`> [upgrade] ${request.url}`);

    socket.onerror = (errorEvent) => {
      console.log(errorEvent);
    };

    this.agent.createConnection((connection) => {
      if (connection === null) {
        socket.close();
        return;
      }

      console.log(request);

      const arr = [
        `${request.method} ${request.url} HTTP/1.1`,
      ];
      request.headers.forEach(
        (value, key, _) => {
          arr.push(`${key}: ${value}`);
        },
      );
      arr.push("");
      arr.push("");

      console.log(connection);
      console.log(typeof connection);
      // connection.pipe(socket);
      // socket.pipe(connection);

      connection.send(arr.join("\r\n"));
    });
  }
}
