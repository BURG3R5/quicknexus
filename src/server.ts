import {
  Context,
  Debug,
  hri,
  logger,
  Oak,
  Router,
  RouterContext,
  send,
  Status,
} from "./dependencies.ts";
import Manager from "./manager.ts";
import { closePortalPath, newPortalPath, showPortalPath } from "./paths.ts";
import { landing, notFound, status } from "./views.ts";

const debug = Debug("quicknexus");

export default class Server {
  oak: Oak;
  router: Router;
  manager: Manager;

  constructor(
    readonly port: number,
    readonly address: string,
    secure: boolean,
    readonly allowDelete: boolean,
    lowerPortLimit: number,
    upperPortLimit: number,
    readonly domain: string | undefined,
    maxSockets: number,
  ) {
    this.oak = new Oak();
    this.router = new Router();
    this.manager = new Manager(
      secure,
      lowerPortLimit,
      upperPortLimit,
      maxSockets,
    );

    this.router
      .get(newPortalPath, this.newPortal.bind(this))
      .get(showPortalPath, this.showPortal.bind(this))
      .get(closePortalPath, this.closePortal.bind(this))
      .get("/", (ctx) => (ctx.response.body = landing()))
      .get(
        "/status",
        (ctx) => (ctx.response.body = status(this.manager.nexusData)),
      )
      .get("/favicon.ico", this.serveStatic)
      .get("/quicknexus.png", this.serveStatic)
      .get("/(.*)", (ctx) => (ctx.response.body = notFound()));

    this.oak.use(logger.logger);
    this.oak.use(this.router.routes());
    this.oak.use(this.router.allowedMethods());
  }

  async listen() {
    debug(`server listening on port: ${this.port}`);

    await this.oak.listen({ port: this.port, hostname: this.address });
  }

  private async newPortal(context: RouterContext<typeof newPortalPath>) {
    const requestedSubDomain: string = context.params.requestedSubDomain;
    let subdomain;
    if (/^(?:[a-z0-9][a-z0-9\-]{2,61}[a-z0-9])$/.test(requestedSubDomain)) {
      if (!this.manager.nexusData.idsUsed.includes(requestedSubDomain)) {
        subdomain = requestedSubDomain;
      } else {
        subdomain = hri.random();
      }
    } else if (requestedSubDomain === "-") {
      subdomain = hri.random();
    } else {
      context.response.status = Status.BadRequest;
      context.response.body = {
        message: "Invalid subdomain: " +
          "Subdomains must be lowercase " +
          "and between 4 and 63 alphanumeric characters",
      };
      return;
    }

    try {
      const data = await this.manager.createPortal(
        subdomain,
        context.request.url.host,
      );
      context.response.body = data;
    } catch (error) {
      if (error.name === "ServerAtCapacity") {
        context.response.status = Status.ServiceUnavailable;
        context.response.body = { message: error.message };
        return;
      } else {
        context.response.status = Status.InternalServerError;
        context.response.body = { message: "Internal Server Error" };
        return;
      }
    }
  }

  private showPortal(context: RouterContext<typeof showPortalPath>) {
    try {
      context.response.body = {
        connectedSockets: this.manager.getPortalStats(context.params.subdomain),
      };
    } catch (error) {
      if (error.name === "PortalNotFound") {
        context.response.status = Status.NotFound;
        context.response.body = { message: error.message };
        return;
      } else {
        context.response.status = Status.InternalServerError;
        context.response.body = { message: "Internal Server Error" };
        return;
      }
    }
  }

  private async closePortal(context: RouterContext<typeof closePortalPath>) {
    if (this.allowDelete) {
      try {
        await this.manager.closePortal(context.params.subdomain);
        context.response.body = { message: "success" };
      } catch (error) {
        if (error.name === "PortalNotFound") {
          context.response.status = Status.NotFound;
          context.response.body = { message: error.message };
          return;
        } else {
          context.response.status = Status.InternalServerError;
          context.response.body = { message: "Internal Server Error" };
          return;
        }
      }
    } else {
      context.response.status = Status.Unauthorized;
      context.response.body = {
        message: "Delete Failed: This quicknexus instance " +
          "does not support deleting endpoints",
      };
    }
  }

  private async serveStatic(context: Context) {
    await send(context, context.request.url.pathname, {
      root: `${Deno.cwd()}/static`,
      immutable: true,
    });
  }
}
