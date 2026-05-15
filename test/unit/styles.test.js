import { describe, it, expect } from 'vitest';
import '../../enhanced-doc.js';

const { styles } = window.__enhancedDoc;
const css = styles().textContent;

describe('styles', () => {
  it('defines .layout rule', () => {
    expect(css).toContain('.layout{');
  });

  it('defines #toc rule', () => {
    expect(css).toContain('#toc{');
  });

  it('defines #content rule', () => {
    expect(css).toContain('#content{');
  });

  it('defines .ed-admonition rule', () => {
    expect(css).toContain('.ed-admonition{');
  });

  it('defines admonition color variants', () => {
    expect(css).toContain('.admonition-tip{');
    expect(css).toContain('.admonition-warning{');
    expect(css).toContain('.admonition-note{');
    expect(css).toContain('.admonition-error{');
  });

  it('defines .mermaid rule', () => {
    expect(css).toContain('.mermaid{');
  });

  it('defines .ed-chart rule', () => {
    expect(css).toContain('.ed-chart{');
  });

  it('defines #ed-fontbar rule', () => {
    expect(css).toContain('#ed-fontbar{');
  });

  it('defines collapsible heading rules', () => {
    expect(css).toContain('.ed-collapsible{');
    expect(css).toContain('.ed-section.ed-collapsed{');
  });

  it('has mobile breakpoint at 800px', () => {
    expect(css).toMatch(/@media.*max-width:\s*800px/);
  });

  it('hides #toc on print', () => {
    expect(css).toMatch(/@media\s+print/);
    expect(css).toContain('#toc{display:none');
  });
});
