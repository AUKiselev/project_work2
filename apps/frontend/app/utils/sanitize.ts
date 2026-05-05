// Whitelist-санитизация richtext перед v-html.
//
// isomorphic-dompurify — drop-in замена dompurify с поддержкой SSR
// (на сервере использует jsdom, на клиенте — нативный DOMPurify),
// поэтому одна и та же функция корректно работает и в Nitro/Nuxt SSR,
// и в браузере, и в тестах (happy-dom/vitest).
import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'ul', 'ol', 'li',
  'strong', 'em', 'b', 'i', 'u', 's',
  'a', 'img',
  'blockquote', 'code', 'pre',
];
const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'target', 'rel'];

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    KEEP_CONTENT: true,
  });
}
