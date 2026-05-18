// 单元测试环境准备
// 模拟 CDN 全局变量和 DOM，使 enhanced-doc.js IIFE 能安全执行

window.marked = {
  use: () => {},
  parse: (s) => s,
  marked: {},
};

window.markedGfmHeadingId = {
  gfmHeadingId: () => () => {},
};

window.mermaid = {
  initialize: () => {},
  run: () => Promise.resolve(),
  render: () => Promise.resolve({ svg: '<svg></svg>' }),
  registerLayoutLoaders: () => {},
};

window.echarts = {
  init: () => ({
    setOption: () => {},
    resize: () => {},
  }),
  getInstanceByDom: () => null,
};

window.tocbot = {
  init: () => {},
};

window.svgPanZoom = () => {};

// 让 script / link 的 onload 立即触发，模拟 CDN 加载成功
const origCreateElement = document.createElement.bind(document);
document.createElement = function (tag, options) {
  const el = origCreateElement(tag, options);
  if (tag === 'script' || tag === 'link') {
    setTimeout(() => {
      if (el.onload) el.onload();
    }, 0);
  }
  return el;
};

// requestAnimationFrame 同步执行（避免 postProcess 的延迟依赖）
globalThis.requestAnimationFrame = (fn) => fn();
