import { describe, it, expect, vi, beforeEach } from 'vitest';
import '../../enhanced-doc.js';

const { resizeAllCharts } = window.__enhancedDoc;

describe('resizeAllCharts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
  });

  it('calls resize on echarts instances found in the root element', () => {
    const root = document.createElement('div');
    const el = document.createElement('div');
    el.className = 'ed-chart';
    root.appendChild(el);
    document.body.appendChild(root);

    const mockResize = vi.fn();
    window.echarts.getInstanceByDom = vi.fn((dom) => {
      if (dom === el) return { resize: mockResize };
      return null;
    });

    resizeAllCharts(root);
    vi.runAllTimers();

    expect(mockResize).toHaveBeenCalledTimes(1);
  });

  it('defaults root to document when no root is given', () => {
    const el = document.createElement('div');
    el.className = 'ed-chart';
    document.body.appendChild(el);

    const mockResize = vi.fn();
    window.echarts.getInstanceByDom = vi.fn(() => ({ resize: mockResize }));

    resizeAllCharts();
    vi.runAllTimers();

    expect(mockResize).toHaveBeenCalledTimes(1);
  });

  it('skips elements without echarts instance', () => {
    const el = document.createElement('div');
    el.className = 'ed-chart';
    document.body.appendChild(el);

    const mockResize = vi.fn();
    window.echarts.getInstanceByDom = vi.fn(() => null);

    resizeAllCharts();
    vi.runAllTimers();

    expect(mockResize).not.toHaveBeenCalled();
  });

  it('handles multiple chart elements', () => {
    for (let i = 0; i < 3; i++) {
      const el = document.createElement('div');
      el.className = 'ed-chart';
      document.body.appendChild(el);
    }

    const mockResize = vi.fn();
    window.echarts.getInstanceByDom = vi.fn(() => ({ resize: mockResize }));

    resizeAllCharts();
    vi.runAllTimers();

    expect(mockResize).toHaveBeenCalledTimes(3);
  });

  it('does not query outside given root', () => {
    const root = document.createElement('div');
    const inside = document.createElement('div');
    inside.className = 'ed-chart';
    root.appendChild(inside);

    const outside = document.createElement('div');
    outside.className = 'ed-chart';
    document.body.appendChild(outside);

    const mockResize = vi.fn();
    window.echarts.getInstanceByDom = vi.fn(() => ({ resize: mockResize }));

    resizeAllCharts(root);
    vi.runAllTimers();

    // Only the chart inside root should be found
    expect(mockResize).toHaveBeenCalledTimes(1);
  });
});
