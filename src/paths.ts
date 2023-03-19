/*
 * When requesting a new portal, user can either request a particular subdomain
 * or send a "-" which means "gimme a random one"
 */
export const newPortalPath = "/portal/:requestedSubDomain/new" as const;

export const showPortalPath = "/portal/:subdomain/stats" as const;

export const closePortalPath = "/portal/:subdomain/close" as const;
