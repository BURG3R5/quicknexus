import { yargs } from "./dependencies.ts";
import Arguments from "./types/arguments.ts";
import Server from "./server.ts";
import { isInteger, validateInputAsPort } from "./utils.ts";

let command, argv: Arguments;

// create cli
{
  command = yargs(Deno.args)
    .usage(
      "Usage: nexus [--port PORT] [--secure] [--allow-delete] " +
        "[--config PATH_TO_CONFIG_FILE] [--domain DOMAIN] [...]",
    )
    .config()
    .help()
    .options("port", {
      default: 9995,
      describe: "listen on this port for outside requests",
      type: "number",
    })
    .options("secure", {
      default: false,
      describe: "use this flag to indicate proxy over https",
      type: "boolean",
    })
    .options("allow-delete", {
      default: false,
      describe:
        "use this flag to create endpoint that allows users to delete clients that may be accidentally open",
      type: "boolean",
    })
    .options("lower-port-limit", {
      default: 40000,
      describe: "Lower limit for the range of ports to give out",
      type: "number",
    })
    .options("upper-port-limit", {
      default: 50000,
      describe: "Upper limit for the range of ports to give out",
      type: "number",
    })
    .options("max-sockets", {
      default: 10,
      describe:
        "maximum number of tcp sockets each client is allowed to establish at one time (the tunnels)",
      type: "number",
    })
    .options("domain", {
      describe:
        "Specify the base domain name. This is optional if hosting quicknexus from a regular example.com domain. This is required if hosting a quicknexus from a subdomain (i.e. tunnel.domain.tld where clients will be client-app.tunnel.domain.tld)",
    })
    .options("address", {
      default: "0.0.0.0",
      describe: "IP address to bind to",
    });

  argv = command.parseSync();
}

// validate input
{
  const error = validateInputAsPort(argv.port) ||
    validateInputAsPort(argv.lowerPortLimit) ||
    validateInputAsPort(argv.upperPortLimit);
  if (error) {
    console.error(error);
    Deno.exit(1);
  }

  if (!isInteger(argv.maxSockets)) {
    console.error("Invalid arguments: `max-sockets` must be an integer");
    Deno.exit(1);
  }
}

// serve
{
  const server = new Server(
    argv.port,
    argv.address,
    argv.secure,
    argv.allowDelete,
    argv.lowerPortLimit,
    argv.upperPortLimit,
    argv.domain,
    argv.maxSockets,
  );

  await server.listen();
}

Deno.addSignalListener("SIGINT", Deno.exit);
