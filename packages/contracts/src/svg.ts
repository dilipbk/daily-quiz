// The grammar of rendered math (ADR 0022). A formula reaches a device as SVG markup, and a
// device draws it; on the web it is placed in a page. So the string is held to a small grammar,
// written out here as an allowlist: only the elements and attributes MathJax's SVG output is
// made of, every value quoted, and no way to name anything outside the drawing.
//
// It is a grammar in plain string code and not an XML parser, for the reason content links are
// (ADR 0008): a parser forgives what it reads, and then the string that was checked is not the
// string that gets drawn. Whatever this grammar doesn't describe is refused: a comment, a
// doctype, an unquoted value, a tag name in the wrong case, a character reference in an
// attribute. A formula whose markup needs more than this is a change to the lists below.

/** The longest rendered formula, in UTF-16 units. */
export const maxSvgLength = 200_000;

/** Shapes, groups, text and descriptions. Nothing that runs, loads, links, styles or animates. */
const allowedElements: readonly string[] = [
  'svg',
  'g',
  'defs',
  'path',
  'use',
  'rect',
  'line',
  'ellipse',
  'circle',
  'polygon',
  'polyline',
  'text',
  'tspan',
  'title',
  'desc',
];

/** Geometry, paint, text and accessibility attributes. Any `data-` attribute is allowed too. */
const allowedAttributes: readonly string[] = [
  'xmlns',
  'xmlns:xlink',
  'version',
  'width',
  'height',
  'viewBox',
  'preserveAspectRatio',
  'overflow',
  'role',
  'focusable',
  'aria-hidden',
  'aria-label',
  'aria-labelledby',
  'aria-describedby',
  'id',
  'class',
  'style',
  'transform',
  'd',
  'points',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'dx',
  'dy',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'fill',
  'fill-opacity',
  'fill-rule',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-dasharray',
  'opacity',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'text-anchor',
  'href',
  'xlink:href',
];

const namespaces: Readonly<Record<string, string>> = {
  xmlns: 'http://www.w3.org/2000/svg',
  'xmlns:xlink': 'http://www.w3.org/1999/xlink',
};

/** Text between elements: any character but `<`, and `&` only as a whole reference. */
const TEXT = /^(?:[^&]|&(?:amp|lt|gt|quot|apos|#[0-9]{1,7}|#x[0-9A-Fa-f]{1,6});)*$/;

/** An attribute's value: `&` only as one of XML's five named references, never a numeric one. */
const VALUE = /^(?:[^&]|&(?:amp|lt|gt|quot|apos);)*$/;

function attributeProblem(name: string, value: string): string | null {
  if (!allowedAttributes.includes(name) && !/^data-[a-z0-9-]+$/.test(name)) {
    return `The attribute "${name}" is not allowed.`;
  }
  if (!VALUE.test(value)) {
    return `The attribute "${name}" holds a character reference other than &amp;, &lt;, &gt;, &quot; or &apos;.`;
  }
  if (/url\s*\(/i.test(value)) return `The attribute "${name}" holds a url().`;

  if (name === 'href' || name === 'xlink:href') {
    // A reference may point only inside the same drawing, as MathJax's <use href="#…"> does.
    return /^#[A-Za-z0-9_.:-]{1,128}$/.test(value)
      ? null
      : 'A reference must point inside the drawing, as "#id".';
  }
  if (name === 'style') {
    // Plain declarations such as "vertical-align: -0.566ex;": no brackets, quotes or escapes.
    return /^[A-Za-z0-9\s:;.,%#-]*$/.test(value)
      ? null
      : 'A style holds something other than plain declarations.';
  }
  const namespace = namespaces[name];
  if (namespace !== undefined && value !== namespace) {
    return `The attribute "${name}" must be "${namespace}".`;
  }
  return null;
}

/** Reads what follows a tag's name: quoted attributes, then an optional closing slash. */
function attributesOf(
  rest: string,
): { readonly problem: string } | { readonly selfClosing: boolean } {
  const attribute = /\s+([A-Za-z][A-Za-z0-9:_-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  const seen: string[] = [];
  let position = 0;

  for (;;) {
    attribute.lastIndex = position;
    const match = attribute.exec(rest);
    // The next attribute must start exactly where the last one ended.
    if (match?.index !== position) break;

    const name = match[1] ?? '';
    if (seen.includes(name)) return { problem: `The attribute "${name}" appears twice.` };
    seen.push(name);

    const problem = attributeProblem(name, match[2] ?? match[3] ?? '');
    if (problem !== null) return { problem };
    position += match[0].length;
  }

  const tail = rest.slice(position);
  if (!/^\s*\/?$/.test(tail)) {
    return { problem: 'An element holds something that is not a quoted attribute.' };
  }
  return { selfClosing: tail.endsWith('/') };
}

/**
 * Why a string is refused as rendered math, or `null` when it is one well-nested `<svg>` element
 * made only of the allowed elements and attributes.
 */
export function svgProblem(svg: string): string | null {
  if (svg.length > maxSvgLength) return 'It is too long.';

  // A tag: `<name …>` or `</name>`, where `…` holds no `<` or `>` outside a quoted value.
  const tag = /<(\/?)([A-Za-z][A-Za-z0-9]*)((?:[^<>"']|"[^"]*"|'[^']*')*)>/g;
  const open: string[] = [];
  let rootClosed = false;
  let position = 0;

  while (position < svg.length) {
    if (rootClosed) return 'Nothing may follow the closing </svg>.';

    if (svg[position] !== '<') {
      if (open.length === 0) return 'It must start with <svg.';
      const next = svg.indexOf('<', position);
      const end = next === -1 ? svg.length : next;
      if (!TEXT.test(svg.slice(position, end)))
        return 'Its text holds a broken character reference.';
      position = end;
      continue;
    }

    tag.lastIndex = position;
    const match = tag.exec(svg);
    if (match?.index !== position) {
      return 'It holds markup that is not a plain element: a comment, a doctype, an instruction or a broken tag.';
    }
    const name = match[2] ?? '';
    const rest = match[3] ?? '';
    if (!allowedElements.includes(name)) return `The element <${name}> is not allowed.`;

    if (match[1] === '/') {
      if (rest.trim() !== '') return 'A closing tag holds more than its name.';
      if (open.pop() !== name) return 'Its elements are not properly nested.';
      rootClosed = open.length === 0;
    } else {
      if (open.length === 0 && name !== 'svg') return 'It must be one <svg> element.';
      const attributes = attributesOf(rest);
      if ('problem' in attributes) return attributes.problem;
      if (!attributes.selfClosing) open.push(name);
      else rootClosed = open.length === 0;
    }
    position += match[0].length;
  }

  return rootClosed ? null : 'It must be one <svg> element, closed with </svg>.';
}
