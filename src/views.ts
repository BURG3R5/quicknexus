import { Context, Debug, send } from "./dependencies.ts";

const debug = Debug("quicknexus.views");

export default class Views {
  static async landing(context: Context) {
    await send(context, "/landing.html", {
      root: `${Deno.cwd()}/static`,
      immutable: true,
    });
  }

  static status(context: Context /*, nexusData: NexusData*/) {
    // Read the template file
    const templateContent = Deno.readTextFileSync(
      `${Deno.cwd()}/static/status.html`,
    );

    // Construct dynamic content
    let layerTwoContent = "";
    let idPortTable = "";
    {
      const { rss, heapUsed, heapTotal, external } = Deno.memoryUsage();
      layerTwoContent =
        `<code>${rss}<br />${heapUsed}<br />${heapTotal}<br />${external}</code>`;

      for (let i = 0; i < 3 /*nexusData.idsUsed.length*/; i++) {
        idPortTable += '<div class="table-row">' +
          `<code class="table-row-title">${"burgers"}</code>` +
          `<code class="table-row-body">${40376}</code>` +
          // `<code class="table-row-title">${nexusData.idsUsed[i]}</code>` +
          // `<code class="table-row-body">${nexusData.portsEngaged[i]}</code>` +
          "</div>";
      }

      if (idPortTable === "") {
        idPortTable = "<code>no portals</code>";
      }
    }

    // Fill in the dynamic content
    const modifiedTemplate = templateContent
      .replace("{{layerTwoContent}}", layerTwoContent)
      .replace("{{idPortTable}}", idPortTable);

    // Set the response headers
    context.response.headers.set("Content-Type", "text/html");

    // Send the modified template
    context.response.status = 200;
    context.response.body = modifiedTemplate;
  }

  static async notFound(context: Context) {
    debug(`The page at \`${context.request.url.pathname}\` is in high demand!`);

    await send(context, "/404.html", {
      root: `${Deno.cwd()}/static`,
      immutable: true,
    });
  }

  static async static(context: Context) {
    await send(context, context.request.url.pathname, {
      root: `${Deno.cwd()}/static`,
      immutable: true,
    });
  }
}
