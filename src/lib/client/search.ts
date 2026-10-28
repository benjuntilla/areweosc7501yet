// The engine and the entries stay out of the first page load. They load on the first open, or
// before it, when a pointer or focus reaches a search button. A module runs once, so they load once.
export const loadSearch = () => import('./search-index.ts').then((m) => m.find);

/** The keys that open search, which each search button names. */
export const searchKeys = 'Meta+K Control+K /';
