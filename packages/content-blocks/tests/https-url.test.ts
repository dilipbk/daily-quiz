import { describe, expect, it } from 'vitest';
import { isHttpsUrl } from '../src/index.ts';

// SEC-08: "Links in content are https-only." Where the spec is silent the reading is the strict
// one (ADR 0003): one canonical, all-ASCII spelling that every URL parser reads the same way.

describe('isHttpsUrl', () => {
  it.each([
    'https://example.com',
    'https://example.com/',
    'https://en.wikipedia.org/wiki/Photosynthesis',
    'https://en.wikipedia.org/wiki/Caf%C3%A9?action=history&limit=20#top',
    'https://www.example.co.uk/a/b.html?x=1&y=2',
    'https://xn--mnchen-3ya.de/',
    'https://medium.com/@author/a-post',
    "https://example.com/a(b)/c;d=e,f!g*h'i+j$k~l_m",
    'https://example.com?q=1',
    'https://example.com#section',
    'https://a-b.example.org/A/B/C',
  ])('SEC-08: accepts the https link %j', (href) => {
    expect(isHttpsUrl(href)).toBe(true);
  });

  it.each([
    'http://example.com',
    'HTTP://example.com',
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'ftp://example.com/file',
    'mailto:someone@example.com',
    'tel:+15550100',
    'blob:https://example.com/0192f3a1',
    'about:blank',
    'intent://example.com#Intent;scheme=https;end',
    'myapp://challenge/123',
    '//example.com/path',
    '/wiki/Photosynthesis',
    'wiki/Photosynthesis',
    'example.com',
    'www.example.com/page',
    '#top',
    '',
    'https:example.com',
    'https:/example.com',
    'https//example.com',
    'https:\\\\example.com',
  ])("SEC-08: rejects a link that isn't https: %j", (href) => {
    expect(isHttpsUrl(href)).toBe(false);
  });

  it.each(['HTTPS://example.com', 'Https://example.com', 'hTTps://example.com/page'])(
    'SEC-08: rejects https spelled in anything but lowercase: %j',
    (href) => {
      expect(isHttpsUrl(href)).toBe(false);
    },
  );

  it.each([
    ' https://example.com',
    'https://example.com ',
    '\thttps://example.com',
    'https://example.com\n',
    '\r\nhttps://example.com',
    'https://exam ple.com',
    'https://example.com/a b',
    'https://example.com/a\tb',
    '\u00a0https://example.com',
    'https://example.com\u3000',
    'java\nscript:alert(1)',
  ])('SEC-08: rejects a link with leading, trailing or inner whitespace: %j', (href) => {
    expect(isHttpsUrl(href)).toBe(false);
  });

  it.each([
    'https://user@example.com',
    'https://user:secret@example.com/',
    'https://example.com@evil.example',
    'https://example.com:443@evil.example/',
    'https://@example.com',
    'https://example.com\\@evil.example',
    'https://example.com%40evil.example',
  ])('SEC-08: rejects a link carrying a username or password: %j', (href) => {
    expect(isHttpsUrl(href)).toBe(false);
  });

  it.each([
    'https://',
    'https:///path',
    'https://?q=1',
    'https://localhost',
    'https://example',
    'https://127.0.0.1',
    'https://127.0.0.1/admin',
    'https://2130706433',
    'https://0x7f.0.0.1',
    'https://example.0x7f',
    'https://[::1]/',
    'https://[2001:db8::1]',
    'https://example.com.',
    'https://.example.com',
    'https://example..com',
    'https://exa_mple.com',
    'https://-example.com',
    'https://example-.com',
    'https://example.c',
    'https://EXAMPLE.com',
    'https://Example.Com/page',
    'https://ex\u0430mple.com',
    'https://مثال.com',
    'https://example.com:8443/',
    'https://example.com:443',
    'https://example.com:',
    `https://${'a'.repeat(64)}.com`,
    `https://${'a.'.repeat(126)}com`,
  ])('SEC-08: rejects a link whose host is not a plain lowercase domain name: %j', (href) => {
    expect(isHttpsUrl(href)).toBe(false);
  });

  it.each([
    'https://example.com/<script>',
    'https://example.com/"quoted"',
    'https://example.com/a\\b',
    'https://example.com/{a}|b^c`d',
    'https://example.com/a[1]',
    'https://example.com/%zz',
    'https://example.com/100%',
    'https://example.com/%4',
    'https://example.com/a#b#c',
    'https://example.com/café',
    'https://example.com/\u202egnp.exe',
    'https://example.com/\u0000',
    'https://example.com/a\u200bb',
  ])('SEC-08: rejects a link with characters a URL must percent-encode: %j', (href) => {
    expect(isHttpsUrl(href)).toBe(false);
  });

  it('SEC-08: accepts a link of 2,048 characters and rejects one of 2,049', () => {
    const prefix = 'https://example.com/';

    expect(isHttpsUrl(prefix + 'a'.repeat(2048 - prefix.length))).toBe(true);
    expect(isHttpsUrl(prefix + 'a'.repeat(2049 - prefix.length))).toBe(false);
  });

  it('SEC-08: accepts host labels of 63 characters and a host of 253', () => {
    expect(isHttpsUrl(`https://${'a'.repeat(63)}.com`)).toBe(true);
    // 124 two-character "a." pairs, then "b.", then "com": 248 + 2 + 3 = 253 characters.
    expect(isHttpsUrl(`https://${'a.'.repeat(124)}b.com`)).toBe(true);
  });
});
