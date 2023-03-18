import { Context, Debug, Oak, Router, send } from "./dependencies.ts";
import { landing, stats } from "./views.ts";

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
    readonly maxSockets: number
  ) {
    this.oak = new Oak();
    this.router = new Router();

    this.router
      .get("/", (ctx) => (ctx.response.body = landing()))
      .get("/stats", (ctx) => (ctx.response.body = stats()))
      .get("/portal/:id/new", this.newTunnel)
      .get("/portal/:id/stats", this.tunnelStats)
      .get("/portal/:id/delete", this.deleteTunnel)
      .get("/favicon.ico", this.favicon);

    this.oak.use(this.router.routes());
    this.oak.use(this.router.allowedMethods());
  }

  async listen() {
    debug(`server listening on port: ${this.port}`);

    await this.oak.listen({ port: this.port, hostname: this.address });
  }

  private async newTunnel(_context: Context) {}
  private async tunnelStats(_context: Context) {}
  private async deleteTunnel(_context: Context) {}

  private async favicon(context: Context) {
    await send(context, context.request.url.pathname, {
      root: `${Deno.cwd()}/static`,
      immutable: true,
    });
  }
}
