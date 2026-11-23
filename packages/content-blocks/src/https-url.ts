import { blockLimits } from './limits.ts';

/** Why a string is not an acceptable link. */
export type HttpsUrlProblem =
  'too_long' | 'whitespace' | 'scheme' | 'credentials' | 'port' | 'host' | 'characters';

const SCHEME = 'https://';
const MAX_HOST_LENGTH = 253;

// A DNS label: lowercase letters, digits and inner hyphens, 63 characters at most.
const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

// The last label starts with a letter. URL parsers read a host as an IPv4 address only when its
// last label is a number (decimal or 0x hex), so no spelling of an IP address gets through.
const TOP_LEVEL_LABEL = /^[a-z][a-z0-9-]{0,61}[a-z0-9]$/;

// What RFC 3986 allows in a path, a query and a fragment: unreserved characters, sub-delimiters,
// ":", "@", "/", "?" and percent-encoded bytes. Anything else must arrive percent-encoded.
const URL_CHARACTERS = /^(?:[A-Za-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9A-Fa-f]{2})*$/;

function isDomainName(host: string): boolean {
  if (host.length > MAX_HOST_LENGTH) return false;

  const labels = host.split('.');
  const topLevel = labels.pop();

  return (
    topLevel !== undefined &&
    TOP_LEVEL_LABEL.test(topLevel) &&
    labels.length > 0 &&
    labels.every((label) => LABEL.test(label))
  );
}

/**
 * Says what is wrong with a link, or returns `null` when nothing is.
 *
 * This is a grammar, not a URL parser: it accepts one canonical, all-ASCII spelling
 * (`https://` + a lowercase domain name + an RFC 3986 path, query and fragment) and rejects the
 * rest. A link that passes means the same thing to every URL parser that will later open it, and
 * the check needs no platform `URL` class, so it runs unchanged on Hermes and on the server.
 */
export function httpsUrlProblem(value: string): HttpsUrlProblem | null {
  if (value.length > blockLimits.hrefLength) return 'too_long';
  if (/\s/u.test(value)) return 'whitespace';
  if (!value.startsWith(SCHEME)) return 'scheme';

  const afterScheme = value.slice(SCHEME.length);
  const authorityEnd = afterScheme.search(/[/?#]/);
  const authority = authorityEnd === -1 ? afterScheme : afterScheme.slice(0, authorityEnd);
  const rest = authorityEnd === -1 ? '' : afterScheme.slice(authorityEnd);

  if (authority.includes('@')) return 'credentials';
  if (/:\d*$/.test(authority)) return 'port';
  if (!isDomainName(authority)) return 'host';

  const [beforeFragment = '', fragment = '', ...moreFragments] = rest.split('#');
  const wellFormed =
    moreFragments.length === 0 &&
    URL_CHARACTERS.test(beforeFragment) &&
    URL_CHARACTERS.test(fragment);

  return wellFormed ? null : 'characters';
}

/**
 * True for a link that content may carry (SEC-08): lowercase `https://`, a plain domain name, no
 * credentials, no port, no whitespace, nothing outside ASCII.
 */
export function isHttpsUrl(value: string): boolean {
  return httpsUrlProblem(value) === null;
}
