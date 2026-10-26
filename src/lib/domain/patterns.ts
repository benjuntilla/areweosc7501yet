/** A calendar day, like 2026-10-13. */
export const day = /^\d{4}-\d{2}-\d{2}$/u;
/** A UTC instant in the form the loader writes native TOML date-times. */
export const instant = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
/** Only RFC 3986 characters, since URL would quietly encode spaces or quotes. */
export const uriCharacters = /^[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]*$/u;
/** A GitHub owner/name. */
export const repo = /^[\w.-]+\/[\w.-]+$/u;
/** An entry file's name: lowercase words joined by hyphens. */
export const slug = /^[a-z0-9]+(-[a-z0-9]+)*$/u;

// URL patterns, as JSON Schema regex source. Each optional part is one group, so the GitHub
// pattern's owner and name are groups 3 and 4.
const userinfo = '([^/?#\\s@]*@)?';
const host = '[^/?#\\s@:]+';
const port = '(:[0-9]*)?';
/** The end of the URL, or the start of a path, query or fragment. */
const end = '([/?#]|$)';
/** A path segment, after one or more slashes. */
const segment = '/+([^/?#]+)';
/** A lowercase https scheme, optional userinfo, a nonempty host and an optional port. */
export const httpsUrl = `^https://${userinfo}${host}${port}${end}`;
/** A github.com URL (optional userinfo and port) with owner and name. */
export const githubRepoUrl = `^https://${userinfo}github\\.com${port}${segment}${segment}${end}`;
