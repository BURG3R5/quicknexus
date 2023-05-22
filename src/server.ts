import { Paths, subdomainRegex } from "./constants.ts";
import {
  Debug,
  getSubdomain,
  hri,
  http,
  logger,
  Oak,
  Router,
  RouterContext,
  stream,
} from "./dependencies.ts";
import Manager from "./manager.ts";
import {
  convertFromIncomingMessage,
  writeToServerResponse,
} from "./translators.ts";
import Views from "./views.ts";

const debug = Debug("quicknexus.server");

export default class Server {
  server: http.Server;
  oak: Oak;
  router: Router;
  manager: Manager;

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
    // init Manager
    {
      this.manager = new Manager(
        this.secure,
        this.lowerPortLimit,
        this.upperPortLimit,
        this.maxSockets,
      );
    }

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
          (ctx) => Views.status(ctx, this.manager.nexusData),
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
    // figure out for whom it is meant
    let subdomain: string | null;
    {
      const hostname = incomingMessage.headers.host;
      if (!hostname) {
        serverResponse.statusCode = 400;
        serverResponse.end({ message: "Host header is required", ok: false });
        return;
      }

      subdomain = getSubdomain(hostname);
    }

    if (subdomain === null) { // let Oak handle it
      const oakRequest: Request = convertFromIncomingMessage(
        incomingMessage,
        this.secure,
      );

      const oakResponse = await this.oak.handle(oakRequest);

      const wasHandledByOak = writeToServerResponse(
        oakResponse,
        serverResponse,
      );
      if (!wasHandledByOak) {
        serverResponse.statusCode = 404;
        serverResponse.write({ message: "How did you get here?", ok: false });
        serverResponse.end();
      }
    } else { // find a client to handle it
      const portal = this.manager.portals.get(subdomain);
      if (!portal) {
        serverResponse.statusCode = 404;
        serverResponse.end({ message: "Portal not found", ok: false });
        return;
      }

      const portalRequest: Request = convertFromIncomingMessage(
        incomingMessage,
        this.secure,
      );

      const portalResponse = await portal.handleRequest(portalRequest);

      const wasHandledByPortal = writeToServerResponse(
        portalResponse,
        serverResponse,
      );
      if (!wasHandledByPortal) {
        serverResponse.statusCode = 404;
        serverResponse.write("How did you get here?");
        serverResponse.end();
      }
    }
  }

  handleUpgrade(
    incomingMessage: http.IncomingMessage,
    socket: stream.Duplex,
    _: undefined,
  ) {
    const hostname = incomingMessage.headers.host;
    if (!hostname) {
      socket.destroy();
      return;
    }

    const subdomain = getSubdomain(hostname);
    if (!subdomain) {
      socket.destroy();
      return;
    }

    const portal = this.manager.portals.get(subdomain);
    if (!portal) {
      socket.destroy();
      return;
    }

    portal.handleUpgrade(incomingMessage, socket);
  }

  private newPortal(context: RouterContext<typeof Paths.newPortal>) {
    // get subdomain
    let subdomain;
    {
      const requestedSubDomain: string = context.params.requestedSubDomain;

      if (subdomainRegex.test(requestedSubDomain)) {
        if (!this.manager.nexusData.idsUsed.includes(requestedSubDomain)) {
          subdomain = requestedSubDomain;
        } else {
          subdomain = hri.random();
        }
      } else if (requestedSubDomain === "-") {
        subdomain = hri.random();
      } else {
        context.response.status = 400;
        context.response.body = {
          message: "Subdomains must be lowercase and " +
            "between 4 and 63 alphanumeric characters",
        };
        return;
      }
    }

    try {
      const data = this.manager.createPortal(
        subdomain,
        context.request.url.host,
      );
      context.response.body = data;
    } catch (error) {
      if (error.name === "ServerAtCapacity") {
        context.response.status = 503;
        context.response.body = { message: error.message, ok: false };
        return;
      } else {
        context.response.status = 500;
        context.response.body = { message: "Internal Server Error", ok: false };
        return;
      }
    }
  }

  private showPortal(context: RouterContext<typeof Paths.showPortal>) {
    try {
      context.response.body = {
        connectedSockets: this.manager.getPortalStats(context.params.subdomain),
      };
    } catch (error) {
      if (error.name === "PortalNotFound") {
        context.response.status = 404;
        context.response.body = { message: error.message, ok: false };
        return;
      } else {
        context.response.status = 500;
        context.response.body = { message: "Internal Server Error", ok: false };
        return;
      }
    }
  }

  private closePortal(context: RouterContext<typeof Paths.closePortal>) {
    if (this.allowDelete) {
      try {
        this.manager.closePortal(context.params.subdomain);
        context.response.body = { message: "success", ok: true };
      } catch (error) {
        if (error.name === "PortalNotFound") {
          context.response.status = 404;
          context.response.body = { message: error.message, ok: false };
          return;
        } else {
          context.response.status = 500;
          context.response.body = {
            message: "Internal Server Error",
            ok: false,
          };
          return;
        }
      }
    } else {
      context.response.status = 403;
      context.response.body = {
        message: "This Nexus instance does not support deleting endpoints",
        ok: false,
      };
    }
  }
}
