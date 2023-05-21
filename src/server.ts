import {
  Debug,
  http,
  logger,
  Oak,
  Router,
  RouterContext,
  stream,
} from "./dependencies.ts";
import { Paths } from "./constants.ts";
import Views from "./views.ts";
import {
  convertFromIncomingMessage,
  writeToServerResponse,
} from "./translators.ts";

const debug = Debug("quicknexus.server");

export default class Server {
  server: http.Server;
  oak: Oak;
  router: Router;

  constructor(
    readonly port: number,
    readonly address: string,
    readonly secure: boolean,
    readonly allowDelete: boolean,
    readonly lowerPortLimit: number,
    readonly upperPortLimit: number,
    readonly domain: string | undefined,
    readonly maxSockets: number,
  ) {
    // configure Oak and Router
    {
      this.oak = new Oak();
      this.router = new Router();

      this.router
        .get(Paths.newPortal, this.newPortal.bind(this))
        .get(Paths.showPortal, this.showPortal.bind(this))
        .get(Paths.closePortal, this.closePortal.bind(this))
        .get(Paths.landing, Views.landing)
        .get(
          Paths.status,
          (ctx) => Views.status(ctx /*, this.manager.nexusData,*/),
        )
        .get(Paths.favicon, Views.static)
        .get(Paths.logo, Views.static)
        .get("/(.*)", Views.notFound);

      this.oak.use(logger.logger);
      this.oak.use(this.router.routes());
      this.oak.use(this.router.allowedMethods());
    }

    // configure Server
    {
      this.server = http.createServer();

      this.server.on("request", this.handleRequest.bind(this));
      this.server.on("upgrade", this.handleUpgrade.bind(this));
    }
  }

  listen() {
    debug(`server listening on port: ${this.port}`);

    this.server.listen(this.port, this.address);
  }

  async handleRequest(
    incomingMessage: http.IncomingMessage,
    serverResponse: http.ServerResponse,
  ) {
    const oakRequest: Request = convertFromIncomingMessage(
      incomingMessage,
      this.secure,
    );

    const oakResponse = await this.oak.handle(oakRequest);

    const wasHandledByOak = writeToServerResponse(oakResponse, serverResponse);
    if (!wasHandledByOak) {
      serverResponse.statusCode = 404;
      serverResponse.write("How did you get here?");
      serverResponse.end();
    }
  }

  handleUpgrade(
    request: http.IncomingMessage,
    socket: stream.Duplex,
    _: undefined,
  ) {
    socket.destroy();
    return;
  }

  private newPortal(context: RouterContext<typeof Paths.newPortal>) {
    context.response.body = "newPortal";
  }

  private showPortal(context: RouterContext<typeof Paths.showPortal>) {
    context.response.body = "showPortal";
  }

  private closePortal(context: RouterContext<typeof Paths.closePortal>) {
    context.response.body = "closePortal";
  }
}
