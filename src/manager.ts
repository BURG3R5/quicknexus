import NexusData from "./types/nexusData.ts";
import PortalData from "./types/portalData.ts";
import Portal from "./portal.ts";
import { PortalNotFound, ServerAtCapacity } from "./exceptions.ts";
import removeItemOnce from "./utils/array.ts";
import randomInRangeWithExclude from "./utils/random.ts";

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

  async createPortal(subdomain: string, host: string): Promise<PortalData> {
    // get a port
    let port: number;
    {
      if (
        this.upperPortLimit - this.lowerPortLimit ===
          this.nexusData.portsEngaged.length
      ) {
        throw new ServerAtCapacity();
      }

      port = randomInRangeWithExclude(
        this.lowerPortLimit,
        this.upperPortLimit,
        this.nexusData.portsEngaged,
      );
    }

    // make a portal
    let portal: Portal;
    {
      portal = new Portal(
        port,
        subdomain,
        this.maxSockets,
      );

      this.portals.set(subdomain, portal);
      this.nexusData.idsUsed.push(subdomain);
      this.nexusData.portsEngaged.push(port);

      portal.once("close", () => {
        this.closePortal(subdomain);
      });
    }

    // start listening
    try {
      await portal.agent.listen();
    } catch (error) {
      this.closePortal(subdomain);
      throw error;
    }

    // return PortalData
    return {
      subdomain,
      port,
      maxSockets: this.maxSockets,
      url: `${this.secure ? "https" : "http"}://${subdomain}.${host}`,
    };
  }

  getPortalStats(subdomain: string): number {
    const portal = this.portals.get(subdomain);

    if (!portal) throw new PortalNotFound();

    return portal.connectedSockets;
  }

  closePortal(subdomain: string) {
    const portal: Portal | undefined = this.portals.get(subdomain);

    if (!portal) throw new PortalNotFound();

    portal.close();

    // Delete from NexusData
    this.portals.delete(subdomain);
    this.nexusData.idsUsed = removeItemOnce(
      this.nexusData.idsUsed,
      subdomain,
    );
    this.nexusData.portsEngaged = removeItemOnce(
      this.nexusData.portsEngaged,
      portal.port,
    );
  }
}
