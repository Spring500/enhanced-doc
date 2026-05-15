import { describe, it, expect } from 'vitest';
import '../../enhanced-doc.js';

const {
  MERMAID_START_RE, MERMAID_RE,
  CHART_START_RE, CHART_RE,
  ADMONITION_START_RE, ADMONITION_RE,
} = window.__enhancedDoc;

describe('Mermaid regex', () => {
  const mermaidBlock = ':::mermaid\nflowchart LR\n  A --> B\n:::';

  it('MERMAID_START_RE matches :::mermaid line', () => {
    expect(MERMAID_START_RE.test(mermaidBlock)).toBe(true);
  });

  it('MERMAID_START_RE does not match plain text', () => {
    expect(MERMAID_START_RE.test('some text\n:::')).toBe(false);
  });

  it('MERMAID_START_RE is case-sensitive (lowercase mermaid only)', () => {
    expect(MERMAID_START_RE.test(':::MERMAID\n')).toBe(false);
  });

  it('MERMAID_RE captures body content', () => {
    const m = mermaidBlock.match(MERMAID_RE);
    expect(m).not.toBeNull();
    expect(m[1]).toBe('flowchart LR\n  A --> B');
  });

  it('MERMAID_RE does not match without closing :::', () => {
    expect(MERMAID_RE.test(':::mermaid\nflowchart')).toBe(false);
  });

  it('MERMAID_RE matches with extra whitespace after :::', () => {
    const block = '::: mermaid \nflowchart\n:::';
    const m = block.match(MERMAID_RE);
    expect(m).not.toBeNull();
    expect(m[1]).toBe('flowchart');
  });
});

describe('Chart regex', () => {
  const chartBlock = ':::chart\n{"xAxis":{"type":"value"}}\n:::';

  it('CHART_START_RE matches :::chart line', () => {
    expect(CHART_START_RE.test(chartBlock)).toBe(true);
  });

  it('CHART_RE captures JSON body', () => {
    const m = chartBlock.match(CHART_RE);
    expect(m).not.toBeNull();
    expect(m[1]).toBe('{"xAxis":{"type":"value"}}');
  });

  it('CHART_RE does not match without closing :::', () => {
    expect(CHART_RE.test(':::chart\n{"xAxis":{}}')).toBe(false);
  });
});

describe('Admonition regex', () => {
  it('ADMONITION_START_RE matches !!! Tip with content', () => {
    expect(ADMONITION_START_RE.test('!!! Tip 标题\n    内容')).toBe(true);
  });

  it('ADMONITION_START_RE matches !!! Note', () => {
    expect(ADMONITION_START_RE.test('!!! Note\n    内容')).toBe(true);
  });

  it('ADMONITION_RE captures kind, title and body', () => {
    const m = '!!! Tip 提示标题\n    正文内容\n    续行'.match(ADMONITION_RE);
    expect(m).not.toBeNull();
    expect(m[1]).toBe('Tip');
    expect(m[2]).toBe('提示标题');
    expect(m[3]).toContain('正文内容');
  });

  it('ADMONITION_RE handles no-title case', () => {
    const m = '!!! Note\n    无标题内容'.match(ADMONITION_RE);
    expect(m).not.toBeNull();
    expect(m[1]).toBe('Note');
    expect(m[2]).toBe('');
  });

  it('ADMONITION_RE handles Warning type', () => {
    const m = '!!! Warning 慎重\n    警告内容'.match(ADMONITION_RE);
    expect(m).not.toBeNull();
    expect(m[1]).toBe('Warning');
  });

  it('ADMONITION_RE handles Error type', () => {
    const m = '!!! Error 禁止\n    禁止内容'.match(ADMONITION_RE);
    expect(m).not.toBeNull();
    expect(m[1]).toBe('Error');
  });

  it('ADMONITION_RE does not match unknown type', () => {
    expect(ADMONITION_RE.test('!!! Unknown\n    内容')).toBe(false);
  });
});
