/*
 * When requesting a new portal, user can either request a particular subdomain
 * or send a "-" which means "gimme a random one"
 */
export const newPortalPath =
  "/portal/:requestedSubDomain([a-z0-9][a-z0-9\-]{2,61}[a-z0-9]|-)/new" as const;

export const showPortalPath =
  "/portal/:subdomain([a-z0-9][a-z0-9\-]{2,61}[a-z0-9])/stats" as const;

export const deletePortalPath =
  "/portal/:subdomain([a-z0-9][a-z0-9\-]{2,61}[a-z0-9])/delete" as const;
