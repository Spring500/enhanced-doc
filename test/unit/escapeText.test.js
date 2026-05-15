import { describe, it, expect } from 'vitest';
import '../../enhanced-doc.js';

const { escapeText } = window.__enhancedDoc;

describe('escapeText', () => {
  it('converts & to &amp;', () => {
    expect(escapeText('a & b')).toBe('a &amp; b');
  });

  it('converts < to &lt;', () => {
    expect(escapeText('<script>')).toBe('&lt;script&gt;');
  });

  it('converts > to &gt;', () => {
    expect(escapeText('</div>')).toBe('&lt;/div&gt;');
  });

  it('returns empty string for empty input', () => {
    expect(escapeText('')).toBe('');
  });

  it('does not modify plain text', () => {
    expect(escapeText('hello world')).toBe('hello world');
  });

  it('escapes all special chars in a single call', () => {
    // escapeText is a simple char replacer, not entity-aware.
    // Calling it on its own output will re-escape the & in &amp; etc.,
    // so it is NOT idempotent. That's expected for this utility.
    const input = '<p>hello & world</p>';
    expect(escapeText(input)).toBe('&lt;p&gt;hello &amp; world&lt;/p&gt;');
  });

  it('handles Chinese + special chars', () => {
    expect(escapeText('你好<span>')).toBe('你好&lt;span&gt;');
  });

  it('handles multiple consecutive special chars', () => {
    expect(escapeText('<<&&>>')).toBe('&lt;&lt;&amp;&amp;&gt;&gt;');
  });
});
