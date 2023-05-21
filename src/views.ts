import { Context, send } from "./dependencies.ts";

export default class Views {
  static landing(context: Context) {
    context.response.body = "landing";
  }

  static status(/*nexusData: NexusData*/): string {
    return "status";
  }

  static notFound(context: Context) {
    context.response.body = "notFound";
  }

  static async static(context: Context) {
    await send(context, context.request.url.pathname, {
      root: `${Deno.cwd()}/static`,
      immutable: true,
    });
  }
}
