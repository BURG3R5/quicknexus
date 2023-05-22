import { Debug, http, stream } from "./dependencies.ts";

export default class Portal {
  connectedSockets: number;
  private debug: Debug;

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
    this.connectedSockets = 0;
    this.debug = Debug(`quicknexus.portal[${this.subdomain}][${this.port}]`);
    this.graceTimeout = 0;
  }

  close() {}

  async handleRequest(request: Request): Promise<Response> {}

  handleUpgrade(incomingMessage: http.IncomingMessage, socket: stream.Duplex) {}
}
