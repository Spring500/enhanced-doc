import { describe, it, expect } from 'vitest';
import '../../enhanced-doc.js';

const { buildLayout } = window.__enhancedDoc;
const html = buildLayout('<p>test content</p>');

describe('buildLayout', () => {
  it('contains toc nav', () => {
    expect(html).toMatch(/<nav\s+id="toc"/);
  });

  it('contains main content area with injected HTML', () => {
    expect(html).toMatch(/<main\s+id="content">/);
    expect(html).toContain('<p>test content</p>');
  });

  it('contains font-size down button with title', () => {
    expect(html).toMatch(/id="ed-fs-down"/);
    expect(html).toContain('title="缩小字号"');
  });

  it('contains font-size up button with title', () => {
    expect(html).toMatch(/id="ed-fs-up"/);
    expect(html).toContain('title="放大字号"');
  });

  it('shows 100% as initial font-size label', () => {
    expect(html).toMatch(/id="ed-fs-label"/);
    expect(html).toContain('100%');
  });

  it('contains theme toggle button', () => {
    expect(html).toMatch(/id="ed-theme-btn"/);
    expect(html).toContain('title="切换主题"');
  });

  it('ed-fontbar comes after content', () => {
    const contentIdx = html.indexOf('id="content"');
    const fontbarIdx = html.indexOf('id="ed-fontbar"');
    expect(contentIdx).toBeLessThan(fontbarIdx);
  });
});
