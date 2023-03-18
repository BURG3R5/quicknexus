import {
  Context,
  Debug,
  Oak,
  Router,
  RouterContext,
  send,
} from "./dependencies.ts";
import { deletePortalPath, newPortalPath, showPortalPath } from "./paths.ts";
import { landing, notFound, stats } from "./views.ts";

const debug = Debug("quicknexus");

export default class Server {
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
    this.oak = new Oak();
    this.router = new Router();

    this.router
      .get("/", (ctx) => (ctx.response.body = landing()))
      .get(
        "/stats",
        (ctx) => (ctx.response.body = stats({
          connectedSockets: 10,
          idsUsed: ["burgers"],
          portsEngaged: [42000],
        })),
      )
      .get(newPortalPath, this.newPortal)
      .get(showPortalPath, this.showPortal)
      .get(deletePortalPath, this.deletePortal)
      .get("/favicon.ico", this.serveStatic)
      .get("/quicknexus.png", this.serveStatic)
      .get("/(.*)", (ctx) => (ctx.response.body = notFound()));

    this.oak.use(this.router.routes());
    this.oak.use(this.router.allowedMethods());
  }

  async listen() {
    debug(`server listening on port: ${this.port}`);

    await this.oak.listen({ port: this.port, hostname: this.address });
  }

  private newPortal(context: RouterContext<typeof newPortalPath>) {
    context.response.body =
      `a new portal: ${context.params.requestedSubDomain}`;
  }

  private showPortal(context: RouterContext<typeof showPortalPath>) {
    context.response.body = `stats for ${context.params.subdomain}: 420`;
  }

  private deletePortal(context: RouterContext<typeof deletePortalPath>) {
    context.response.body = `${context.params.subdomain} has been deleted`;
  }

  private async serveStatic(context: Context) {
    await send(context, context.request.url.pathname, {
      root: `${Deno.cwd()}/static`,
      immutable: true,
    });
  }
}
