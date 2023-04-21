import NexusData from "./types/nexus_data.ts";
import PortalData from "./types/portal_data.ts";
import Portal from "./portal.ts";
import { PortalNotFound, ServerAtCapacity } from "./exceptions.ts";
import { randomInRangeWithExclude, removeItemOnce } from "./utils.ts";

export default class Manager {
  nexusData: NexusData;
  portals: Map<string, Portal>;

  constructor(
    readonly secure: boolean,
    readonly lowerPortLimit: number,
    readonly upperPortLimit: number,
    readonly maxSockets: number,
  ) {
    this.nexusData = {
      idsUsed: [],
      portsEngaged: [],
    };
    this.portals = new Map();
  }

  createPortal(subdomain: string, host: string): PortalData {
    if (
      this.upperPortLimit - this.lowerPortLimit ===
        this.nexusData.portsEngaged.length
    ) {
      throw new ServerAtCapacity();
    }

    const port = randomInRangeWithExclude(
      this.lowerPortLimit,
      this.upperPortLimit,
      this.nexusData.portsEngaged,
    );

    const portal = new Portal(
      port,
      subdomain,
      this.closePortal.bind(this),
      this.maxSockets,
    );

    this.portals.set(subdomain, portal);
    this.nexusData.idsUsed.push(subdomain);
    this.nexusData.portsEngaged.push(port);

    try {
      portal.agent.listen();
    } catch (error) {
      this.closePortal(subdomain);
      throw error;
    }

    return {
      subdomain,
      port,
      maxSockets: this.maxSockets,
      url: `${this.secure ? "https" : "http"}://${subdomain}.${host}`,
    };
  }

  getPortalStats(subdomain: string): number {
    const portal = this.portals.get(subdomain);

    if (typeof portal === "undefined") {
      throw new PortalNotFound();
    }

    return portal.connectedSockets;
  }

  closePortal(subdomain: string) {
    const portal = this.portals.get(subdomain);

    this.nexusData.idsUsed = removeItemOnce(this.nexusData.idsUsed, subdomain);
    this.portals.delete(subdomain);

    if (typeof portal === "undefined") {
      // throw new PortalNotFound();
    } else {
      portal.close();

      this.nexusData.portsEngaged = removeItemOnce(
        this.nexusData.portsEngaged,
        portal.port,
      );
    }
  }
}
