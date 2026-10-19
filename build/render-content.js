import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * compiled-identity content renderer.
 *
 * Renders content/site.json into static HTML at build (and dev) time so the
 * published site stays fully usable without JavaScript - the plan's hard
 * architecture rule. Template syntax lives inside HTML comments so the raw
 * template stays valid, readable HTML:
 *
 *   {{site.name}}            token (HTML-escaped)
 *   {{-project.stack}}       token joining an array with ", "
 *   {{&token}}               token inserted without escaping
 *   <!-- @if key --> ... <!-- @endif -->        truthy conditional
 *   <!-- @ifnot key --> ... <!-- @endif -->      falsy conditional
 *   <!-- @each arr --> ... <!-- @endforeach -->  loop over array
 *       (inside loops: item fields first, then root; scalar items use {{value}})
 *
 * No regular expressions are used, so file content never needs backslash
 * escaping when written through a shell heredoc.
 */

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const OPEN_EACH = '<!-- @each ';
const CLOSE_EACH = '<!-- @endforeach -->';
const OPEN_IF = '<!-- @if ';
const OPEN_IFNOT = '<!-- @ifnot ';
const CLOSE_IF = '<!-- @endif -->';

function loadContent() {
  const file = path.join(rootDir, 'content', 'site.json');
  const root = JSON.parse(fs.readFileSync(file, 'utf8'));
  root.site.year = String(new Date().getFullYear());
  return root;
}

function esc(value) {
  return stringify(value)
    .split('&').join('&amp;')
    .split('<').join('&lt;')
    .split('>').join('&gt;')
    .split('"').join('&quot;');
}

function stringify(value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

function getPath(obj, keyPath) {
  const parts = keyPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length; i++) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[parts[i]];
  }
  return cur;
}

function lookup(keyPath, root, item) {
  if (item) {
    const v = getPath(item, keyPath);
    if (v !== undefined) return v;
  }
  return getPath(root, keyPath);
}

function isTruthy(value) {
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
}

function renderTokens(text, root, item) {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const start = text.indexOf('{{', i);
    if (start === -1) { out += text.slice(i); break; }
    out += text.slice(i, start);
    const end = text.indexOf('}}', start + 2);
    if (end === -1) { out += text.slice(start); break; }
    const key = text.slice(start + 2, end).trim();
    if (key.charAt(0) === '&') {
      out += stringify(lookup(key.slice(1).trim(), root, item));
    } else if (key.charAt(0) === '-') {
      out += esc(lookup(key.slice(1).trim(), root, item));
    } else {
      out += esc(lookup(key, root, item));
    }
    i = end + 2;
  }
  return out;
}

function findClose(text, from, openMarker, closeMarker) {
  let depth = 1;
  let pos = from;
  while (pos < text.length) {
    const nextOpen = text.indexOf(openMarker, pos);
    const nextClose = text.indexOf(closeMarker, pos);
    if (nextClose === -1) return -1;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      pos = nextOpen + openMarker.length;
      continue;
    }
    depth -= 1;
    if (depth === 0) return nextClose;
    pos = nextClose + closeMarker.length;
  }
  return -1;
}

function processEach(text, root, item) {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const start = text.indexOf(OPEN_EACH, i);
    if (start === -1) { out += text.slice(i); break; }
    out += text.slice(i, start);
    const openEnd = text.indexOf('-->', start);
    if (openEnd === -1) { out += text.slice(start); break; }
    const key = text.slice(start + OPEN_EACH.length, openEnd).trim();
    const closePos = findClose(text, openEnd + 3, OPEN_EACH, CLOSE_EACH);
    if (closePos === -1) { out += text.slice(start); break; }
    const body = text.slice(openEnd + 3, closePos);
    const arr = lookup(key, root, item);
    if (Array.isArray(arr)) {
      for (let n = 0; n < arr.length; n++) {
        const el = arr[n];
        let childItem;
        if (el && typeof el === 'object' && !Array.isArray(el)) {
          childItem = Object.assign({}, item || {}, el);
        } else {
          childItem = Object.assign({}, item || {}, { value: el, index: n });
        }
        out += processBlock(body, root, childItem);
      }
    }
    i = closePos + CLOSE_EACH.length;
  }
  return out;
}

function processConditionals(text, root, item) {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const ifPos = text.indexOf(OPEN_IF, i);
    const ifnotPos = text.indexOf(OPEN_IFNOT, i);
    let start = -1;
    let negate = false;
    if (ifnotPos !== -1 && (ifPos === -1 || ifnotPos < ifPos)) {
      start = ifnotPos;
      negate = true;
    } else if (ifPos !== -1) {
      start = ifPos;
      negate = false;
    }
    if (start === -1) { out += text.slice(i); break; }
    out += text.slice(i, start);
    const openEnd = text.indexOf('-->', start);
    if (openEnd === -1) { out += text.slice(start); break; }
    const keyLen = negate ? OPEN_IFNOT.length : OPEN_IF.length;
    const key = text.slice(start + keyLen, openEnd).trim();
    const closePos = text.indexOf(CLOSE_IF, openEnd);
    if (closePos === -1) { out += text.slice(start); break; }
    const body = text.slice(openEnd + 3, closePos);
    const value = lookup(key, root, item);
    const include = negate ? !isTruthy(value) : isTruthy(value);
    if (include) out += processBlock(body, root, item);
    i = closePos + CLOSE_IF.length;
  }
  return out;
}

function processBlock(text, root, item) {
  let out = processEach(text, root, item);
  out = processConditionals(out, root, item);
  out = renderTokens(out, root, item);
  return out;
}

function render(html, ctx) {
  const root = loadContent();
  const filename = ((ctx && ctx.filename) || '').split(path.sep).join('/');
  const marker = '/projects/';
  const pos = filename.indexOf(marker);
  if (pos !== -1) {
    const rest = filename.slice(pos + marker.length);
    const slug = rest.split('/')[0];
    const proj = (root.projects || []).find(function (p) { return p.slug === slug; });
    if (proj) root.currentProject = proj;
  }
  return processBlock(html, root, null);
}

export function contentRenderer() {
  return {
    name: 'compiled-identity-content',
    transformIndexHtml: function (html, ctx) {
      return render(html, ctx);
    }
  };
}

export { loadContent, render, rootDir };
