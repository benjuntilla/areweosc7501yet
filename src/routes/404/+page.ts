// Cloudflare serves this page for every missing path, where the router would find no route
// to hydrate, so it ships as plain HTML.
export const csr = false;
