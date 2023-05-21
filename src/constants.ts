/**
 * When requesting a new portal, user can either request a particular subdomain
 * or send a "-" which means "gimme a random one"
 */
export class Paths {
  static landing = "/" as const;
  static status = "/status" as const;

  static favicon = "/favicon.ico" as const;
  static logo = "/quicknexus.png" as const;

  static newPortal = "/portal/:requestedSubDomain/new" as const;
  static showPortal = "/portal/:subdomain/stats" as const;
  static closePortal = "/portal/:subdomain/close" as const;
}
