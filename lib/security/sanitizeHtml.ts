const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'strong',
  'em',
  'b',
  'i',
  'u',
  'span',
  'div',
  'ul',
  'ol',
  'li',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'table',
  'thead',
  'tbody',
  'tr',
  'td',
  'th',
  'a',
]);

const GLOBAL_ALLOWED_ATTRS = new Set(['class', 'id', 'title', 'aria-label']);
const TAG_ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan']),
};

const SAFE_URL = /^(https?:|mailto:|#|\/)/i;

function sanitizeAttributes(tagName: string, attrsRaw: string): string {
  const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+)/g;
  const safeParts: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = attrRe.exec(attrsRaw))) {
    const name = match[1].toLowerCase();
    const quoted = match[2];

    if (name.startsWith('on') || name === 'style') continue;

    const tagAttrs = TAG_ALLOWED_ATTRS[tagName] ?? new Set<string>();
    if (!GLOBAL_ALLOWED_ATTRS.has(name) && !tagAttrs.has(name)) continue;

    const unquoted = quoted.replace(/^['"]|['"]$/g, '');

    if ((name === 'href' || name === 'src') && !SAFE_URL.test(unquoted)) continue;
    if (/^javascript:/i.test(unquoted) || /^data:/i.test(unquoted)) continue;

    const escaped = unquoted
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    safeParts.push(`${name}="${escaped}"`);
  }

  return safeParts.length ? ` ${safeParts.join(' ')}` : '';
}

export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return '';

  let html = String(input);

  html = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '');

  return html.replace(/<\/?([a-zA-Z0-9-]+)([^>]*)>/g, (full, tag, attrs) => {
    const tagName = String(tag).toLowerCase();
    const isClosing = full.startsWith('</');

    if (!ALLOWED_TAGS.has(tagName)) {
      return '';
    }

    if (isClosing) return `</${tagName}>`;

    const safeAttrs = sanitizeAttributes(tagName, attrs ?? '');
    const selfClosing = /\/$/.test(full.trim()) || tagName === 'br';
    return selfClosing ? `<${tagName}${safeAttrs} />` : `<${tagName}${safeAttrs}>`;
  });
}
