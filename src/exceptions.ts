export class ConnectionAlreadyOpen extends Error {
  constructor() {
    super("A connection is already open for this portal");
    this.name = "ConnectionAlreadyOpen";
  }
}

export class PortalNotFound extends Error {
  constructor() {
    super("The requested portal couldn't be found; Recheck your spelling");
    this.name = "PortalNotFound";
  }
}

export class ServerAtCapacity extends Error {
  constructor() {
    super("Server capacity has been reached; Try again later");
    this.name = "ServerAtCapacity";
  }
}

export class PortalAgentClosed extends Error {
  constructor() {
    super("PortalAgent is closed");
    this.name = "PortalAgentClosed";
  }
}
