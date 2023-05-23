import { http } from "./dependencies.ts";

export default class Agent extends http.Agent {
  constructor(
    readonly port: number,
    readonly subdomain: string,
    readonly maxSockets: number,
  ) {
    super({
      keepAlive: true,
      // only allow keepalive to hold on to one socket
      // this prevents it from holding on to all the sockets so they can be used for upgrades
      maxFreeSockets: 1,
    });
  }

  listen() {}
}
