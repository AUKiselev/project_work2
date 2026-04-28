import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '~/utils/sanitize';

describe('sanitizeHtml', () => {
  it('пропускает разрешённые теги', () => {
    expect(sanitizeHtml('<p>hello <strong>world</strong></p>')).toBe(
      '<p>hello <strong>world</strong></p>',
    );
  });
  it('режет <script>', () => {
    expect(sanitizeHtml('<p>x</p><script>alert(1)</script>')).toBe('<p>x</p>');
  });
  it('режет on*-атрибуты', () => {
    expect(sanitizeHtml('<a href="/" onclick="x()">y</a>')).toBe('<a href="/">y</a>');
  });
  it('пропускает <a href> и <img src/alt>', () => {
    expect(sanitizeHtml('<a href="https://example.com">a</a>')).toBe(
      '<a href="https://example.com">a</a>',
    );
    expect(sanitizeHtml('<img src="/x.png" alt="x">')).toMatch(/<img[^>]+src="\/x.png"[^>]*alt="x"/);
  });
});
