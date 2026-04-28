// Whitelist-санитизация richtext перед v-html.
import DOMPurifyFactory from 'dompurify';

const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'ul', 'ol', 'li',
  'strong', 'em', 'b', 'i', 'u', 's',
  'a', 'img',
  'blockquote', 'code', 'pre',
];
const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'target', 'rel'];

// DOMPurify требует window на момент вызова sanitize.
// Передаём его явно, чтобы корректно работать как в браузере,
// так и в тестовом окружении (happy-dom/vitest).
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  const purify = DOMPurifyFactory(window as Window & typeof globalThis);
  return purify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    KEEP_CONTENT: true,
  });
}
