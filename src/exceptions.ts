export class ServerAtCapacity extends Error {
  constructor() {
    super("Server capacity has been reached; Try again later");
    this.name = "ServerAtCapacity";
  }
}

export class PortalNotFound extends Error {
  constructor() {
    super("The requested portal couldn't be found; Recheck your spelling");
    this.name = "PortalNotFound";
  }
}
