// Sites strips caller identity and supplies the authenticated platform user ID.
export const resolveSitesOwner=request=>request.headers.get('oai-authenticated-user-id');
