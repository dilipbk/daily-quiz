// The grammar of rendered math (ADR 0022). A formula reaches a device as SVG markup, and a
// device draws it; on the web it may be placed in a page. So the string is held to a small
// grammar, written out here as an allowlist: only the elements and attributes MathJax's SVG
// output is made of, every value quoted, and no way to name anything outside the drawing.
//
// It is a grammar in plain string code and not an XML parser, for the reason content links are
// (ADR 0008): a parser forgives what it reads, and then the string that was checked is not the
// string that gets drawn. Whatever this grammar doesn't describe is refused. A formula whose
// markup needs more than this is a change to the lists below.
//
// The rules that carry the weight:
//
// 1. Every `<` and every `>` in the string delimits a tag. Neither appears in text or inside a
//    value, where they are written `&lt;` and `&gt;`. So no reader, whatever state it is in, can
//    find a tag that this grammar read as text or as a value. A browser's HTML parser changes
//    its rules inside `<title>` and `<desc>`, so those two hold text only.
// 2. White space is a space, a tab, a line feed or a carriage return: the four that XML and HTML
//    both count. JavaScript's `\s` separates nothing here, because it also matches characters
//    such as U+00A0 that a browser reads as part of a name or of an unquoted value.
// 3. Nothing is read as CSS or as an address except where a rule below says what it may be. A
//    value holds no backslash and no bracket, so `\75rl(…)` can't spell `url(…)`; a colour, a
//    transform and a style each have a grammar of their own.
// 4. A `<use>` points at a shape defined in the same drawing, and ids carry MathJax's `MJX-`
//    prefix. So a drawing can't multiply itself, reach into the page it is placed in, or take
//    the name of something that page relies on.
// 5. The scan is one pass with no backtracking, so its time grows with the length of the string
//    and with nothing else.

/** The longest rendered formula, in UTF-16 units. */
export const maxSvgLength = 200_000;

/** The deepest elements may nest. MathJax nests a few levels for each fraction, root or script. */
const maxDepth = 128;

const svgNamespace = 'http://www.w3.org/2000/svg';
const xlinkNamespace = 'http://www.w3.org/1999/xlink';

/** What a `<use>` may point at: something that draws, and holds no further `<use>`. */
const shapeElements: readonly string[] = [
  'path',
  'rect',
  'line',
  'ellipse',
  'circle',
  'polygon',
  'polyline',
];

/** Shapes, groups, text and descriptions. Nothing that runs, loads, links, styles or animates. */
const allowedElements: readonly string[] = [
  'svg',
  'g',
  'defs',
  'use',
  'text',
  'tspan',
  'title',
  'desc',
  ...shapeElements,
];

/** What a browser reads as HTML inside SVG. Here they describe the drawing in text and hold no element. */
const textOnlyElements: readonly string[] = ['title', 'desc'];

/** Geometry, paint, text and accessibility attributes. Any `data-` or `aria-` attribute is allowed too. */
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
  'id',
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

/** The properties a `style` may set: where the drawing sits on the line, and how its text looks. */
const allowedStyleProperties: readonly string[] = [
  'vertical-align',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
];

/** No reader acts on these: they describe. Their values are text, and only rule 1 applies. */
const DESCRIPTIVE_ATTRIBUTE = /^(?:data|aria)-[a-z0-9-]+$/;

/** A control character other than tab, line feed and carriage return, or half of a surrogate pair. */
const UNSUPPORTED_CHARACTER = /(?![\t\n\r])[\p{Cc}\p{Cs}￾￿]/u;

/** Text between elements: no `<` or `>`, and `&` only as a whole reference. */
const TEXT = /^(?:[^<>&]|&(?:amp|lt|gt|quot|apos|#[0-9]{1,7}|#x[0-9A-Fa-f]{1,6});)*$/;

/** An attribute's value: no `<` or `>`, and `&` only as one of XML's five named references. */
const VALUE = /^(?:[^<>&]|&(?:amp|lt|gt|quot|apos);)*$/;

const ELEMENT_NAME = /^[A-Za-z][A-Za-z0-9]*$/;
const ATTRIBUTE_NAME = /^[A-Za-z][A-Za-z0-9:_-]*$/;

/** An id as MathJax writes one. The prefix keeps a drawing from taking a name its page relies on. */
const ID = /^MJX-[A-Za-z0-9_.:-]{1,123}$/;

/** `none`, `currentColor`, a hex colour, a named colour or `rgb(…)`. Never a paint server. */
const COLOUR = /^(?:none|currentColor|#[0-9A-Fa-f]{3,8}|[A-Za-z]{1,32}|rgba?\([0-9 .,%]{1,40}\))$/;

/** A list of the six transform functions, each with numbers and nothing else between its brackets. */
const TRANSFORM =
  /^[ \t\n\r]*(?:(?:matrix|translate|scale|rotate|skewX|skewY)[ \t\n\r]*\([0-9eE .,+\t\n\r-]*\)[ \t\n\r,]*)*$/;

const isSpace = (character: string | undefined): boolean =>
  character === ' ' || character === '\t' || character === '\n' || character === '\r';

/** The index of the first character at or after `from` that is not white space. */
function skipSpace(text: string, from: number): number {
  let index = from;
  while (isSpace(text[index])) index += 1;
  return index;
}

/** The index after the run of letters, digits and `extra` characters that starts at `from`. */
function skipName(text: string, from: number, extra: string): number {
  let index = from;
  while (index < text.length) {
    const code = text.charCodeAt(index);
    const isLetterOrDigit =
      (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
    if (!isLetterOrDigit && !extra.includes(text.charAt(index))) break;
    index += 1;
  }
  return index;
}

/** A numeric reference names a character XML allows: no control, no surrogate, nothing past U+10FFFF. */
function referencesAreCharacters(text: string): boolean {
  for (const [, digits = ''] of text.matchAll(/&#(x[0-9A-Fa-f]{1,6}|[0-9]{1,7});/g)) {
    const code = digits.startsWith('x') ? parseInt(digits.slice(1), 16) : parseInt(digits, 10);
    const allowed =
      code === 0x9 ||
      code === 0xa ||
      code === 0xd ||
      (code >= 0x20 && code <= 0xd7ff) ||
      (code >= 0xe000 && code <= 0xfffd) ||
      (code >= 0x10000 && code <= 0x10ffff);
    if (!allowed) return false;
  }
  return true;
}

function styleProblem(value: string): string | null {
  for (const declaration of value.split(';')) {
    const colon = declaration.indexOf(':');
    const property = (colon === -1 ? declaration : declaration.slice(0, colon)).replace(
      /^[ \t\n\r]+|[ \t\n\r]+$/g,
      '',
    );
    if (colon === -1) {
      if (property === '') continue;
      return 'A style holds something that is not a declaration.';
    }
    if (!allowedStyleProperties.includes(property)) {
      return `A style may not set "${property}".`;
    }
    if (!/^[A-Za-z0-9 .,%+-]*$/.test(declaration.slice(colon + 1))) {
      return `The style "${property}" holds something other than words and numbers.`;
    }
  }
  return null;
}

function attributeProblem(element: string, name: string, value: string): string | null {
  const isDescriptive = DESCRIPTIVE_ATTRIBUTE.test(name);
  if (!isDescriptive && !allowedAttributes.includes(name)) {
    return `The attribute "${name}" is not allowed.`;
  }
  if (!VALUE.test(value)) {
    return `The attribute "${name}" holds a "<", a ">" or a character reference other than &amp;, &lt;, &gt;, &quot; or &apos;.`;
  }
  if (isDescriptive) return null;

  if (value.includes('\\')) return `The attribute "${name}" holds a backslash.`;

  switch (name) {
    case 'href':
    case 'xlink:href':
      if (element !== 'use') return `Only a <use> may hold "${name}".`;
      return value.startsWith('#') && ID.test(value.slice(1))
        ? null
        : 'A reference must point inside the drawing, as "#MJX-…".';
    case 'id':
      return ID.test(value) ? null : 'An id must begin with "MJX-".';
    case 'style':
      return styleProblem(value);
    case 'transform':
      return TRANSFORM.test(value) ? null : 'A transform holds something other than its functions.';
    case 'fill':
    case 'stroke':
      return COLOUR.test(value) ? null : `The attribute "${name}" must be a plain colour.`;
    case 'xmlns':
      return value === svgNamespace ? null : `The attribute "xmlns" must be "${svgNamespace}".`;
    case 'xmlns:xlink':
      return value === xlinkNamespace
        ? null
        : `The attribute "xmlns:xlink" must be "${xlinkNamespace}".`;
    default:
      return /[()]/.test(value) ? `The attribute "${name}" holds a bracket.` : null;
  }
}

interface Tag {
  readonly closing: boolean;
  readonly name: string;
  readonly attributes: ReadonlyMap<string, string>;
  readonly selfClosing: boolean;
}

const notAnElement =
  'It holds markup that is not a plain element: a comment, a doctype, an instruction or a broken tag.';
const notAnAttribute = 'An element holds something that is not a quoted attribute.';

/** Reads what stands between a `<` and the next `>`, or says why it is no tag of this grammar. */
function readTag(inner: string): Tag | string {
  const closing = inner.startsWith('/');
  const nameStart = closing ? 1 : 0;
  const nameEnd = skipName(inner, nameStart, '');
  const name = inner.slice(nameStart, nameEnd);
  if (!ELEMENT_NAME.test(name)) return notAnElement;

  const attributes = new Map<string, string>();
  let selfClosing = false;
  let position = nameEnd;

  while (position < inner.length) {
    const start = skipSpace(inner, position);
    if (start === inner.length) break;
    if (inner[start] === '/' && start === inner.length - 1) {
      selfClosing = true;
      break;
    }
    // An attribute is set apart from what came before it by white space.
    if (start === position) return notAnAttribute;

    const end = skipName(inner, start, ':_-');
    const attribute = inner.slice(start, end);
    const equals = skipSpace(inner, end);
    const quoteAt = skipSpace(inner, equals + 1);
    const quote = inner[quoteAt];
    if (!ATTRIBUTE_NAME.test(attribute) || inner[equals] !== '=') return notAnAttribute;
    if (quote !== '"' && quote !== "'") return notAnAttribute;
    const close = inner.indexOf(quote, quoteAt + 1);
    if (close === -1) return notAnAttribute;
    if (attributes.has(attribute)) return `The attribute "${attribute}" appears twice.`;

    attributes.set(attribute, inner.slice(quoteAt + 1, close));
    position = close + 1;
  }

  if (closing && (attributes.size > 0 || selfClosing)) {
    return 'A closing tag holds more than its name.';
  }
  return { closing, name, attributes, selfClosing };
}

/**
 * Why a string is refused as rendered math, or `null` when it is one well-nested `<svg>` element
 * made only of the allowed elements and attributes. Its time is linear in the string's length.
 */
export function svgProblem(svg: string): string | null {
  if (svg.length > maxSvgLength) return 'It is too long.';
  if (UNSUPPORTED_CHARACTER.test(svg)) {
    return 'It holds a control character or half of a surrogate pair.';
  }

  const open: string[] = [];
  /** Each id, with the element that carries it. */
  const ids = new Map<string, string>();
  const references: string[] = [];
  let declaresXlink = false;
  let usesXlink = false;
  let rootClosed = false;
  let position = 0;

  while (position < svg.length) {
    if (rootClosed) return 'Nothing may follow the closing </svg>.';

    if (svg[position] !== '<') {
      if (open.length === 0) return 'It must start with <svg.';
      const next = svg.indexOf('<', position);
      const end = next === -1 ? svg.length : next;
      const text = svg.slice(position, end);
      if (!TEXT.test(text) || !referencesAreCharacters(text)) {
        return 'Its text holds a ">" or a broken character reference.';
      }
      position = end;
      continue;
    }

    const end = svg.indexOf('>', position);
    if (end === -1) return notAnElement;
    const inner = svg.slice(position + 1, end);
    const tag = inner.includes('<') ? notAnElement : readTag(inner);
    if (typeof tag === 'string') return tag;
    const { name, attributes } = tag;
    if (!allowedElements.includes(name)) return `The element <${name}> is not allowed.`;

    if (tag.closing) {
      if (open.pop() !== name) return 'Its elements are not properly nested.';
      rootClosed = open.length === 0;
    } else {
      const parent = open.at(-1);
      if (parent === undefined) {
        if (name !== 'svg') return 'It must be one <svg> element.';
        if (!attributes.has('xmlns')) return `The <svg> must declare xmlns="${svgNamespace}".`;
        declaresXlink = attributes.has('xmlns:xlink');
      } else if (textOnlyElements.includes(parent)) {
        return `A <${parent}> holds text only.`;
      }
      if (open.length >= maxDepth) return 'Its elements nest too deeply.';

      for (const [attribute, value] of attributes) {
        const problem = attributeProblem(name, attribute, value);
        if (problem !== null) return problem;

        if (attribute === 'id') {
          if (ids.has(value)) return `The id "${value}" is used twice.`;
          ids.set(value, name);
        } else if (attribute === 'href' || attribute === 'xlink:href') {
          references.push(value.slice(1));
          if (attribute === 'xlink:href') usesXlink = true;
        }
      }

      if (!tag.selfClosing) open.push(name);
      else rootClosed = open.length === 0;
    }
    position = end + 1;
  }

  if (!rootClosed) return 'It must be one <svg> element, closed with </svg>.';
  if (usesXlink && !declaresXlink) {
    return `The <svg> must declare xmlns:xlink="${xlinkNamespace}" to use xlink:href.`;
  }
  for (const reference of references) {
    if (!shapeElements.includes(ids.get(reference) ?? '')) {
      return `A <use> must point at a shape defined in the drawing, and "#${reference}" is none.`;
    }
  }
  return null;
}
