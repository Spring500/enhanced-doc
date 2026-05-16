// enhanced-doc.js — 增强 Markdown 文档渲染引擎 (v2)
// 自注入所有 CDN 依赖。模板只需两个 <script> 块：
//   1. <script type="text/x-markdown">  — 正文
//   2. <script src="enhanced-doc.js">  — 本文件

(function() {
'use strict';

const CDN = 'https://cdn.jsdelivr.net/npm';

// Mermaid 容器高度约束
const MERMAID_FALLBACK_WIDTH = 700;
const MERMAID_MIN_HEIGHT_RATIO = 0.5;
const MERMAID_MAX_HEIGHT_RATIO = 2;

// ECharts 默认 grid 边距
const CHART_GRID = { top: 70, bottom: 40, left: 50, right: 20 };

// ═══ 工具：动态加载 JS / CSS ═══
function loadJS(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => { reject(new Error('加载失败: ' + src)); };
    document.head.appendChild(s);
  });
}

function loadCSS(href) {
  return new Promise((resolve, reject) => {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    l.onload = resolve;
    l.onerror = () => { reject(new Error('CSS 加载失败: ' + href)); };
    document.head.appendChild(l);
  });
}

// ═══ 设置暗色主题 ═══
document.documentElement.dataset.theme = 'dark';

// ═══ 1. 串行加载 marked → marked-gfm-heading-id ═══
loadJS(CDN + '/marked/marked.min.js').then(() => {

  // ── 注册 marked 自定义扩展 ──
  registerMarkedExtensions();

  return loadJS(CDN + '/marked-gfm-heading-id/lib/index.umd.js');
}).then(() => {

  // ── 注册 heading-id 扩展 ──
  marked.use(markedGfmHeadingId.gfmHeadingId());

  // ═══ 2. 并行加载其他所有库 ═══
  // MathJax 需要在加载前配置
  window.MathJax = {
    tex: { inlineMath: [['$', '$'], ['\\(', '\\)']] },
    options: { ignoreHtmlClass: 'ed-mermaid|ed-chart' }
  };

  return Promise.all([
    loadCSS(CDN + '/@picocss/pico@2/css/pico.min.css'),
    loadJS(CDN + '/mermaid@11/dist/mermaid.min.js'),
    loadJS(CDN + '/echarts@5/dist/echarts.min.js'),
    loadJS(CDN + '/tocbot@4/dist/tocbot.min.js'),
    loadJS(CDN + '/svg-pan-zoom@3.6.1/dist/svg-pan-zoom.min.js'),
    loadJS(CDN + '/mathjax@3/es5/tex-svg.js')
  ]);
}).then(() => {

  // ═══ 3. 所有库就绪：配置 + 渲染 ═══
  mermaid.initialize({
    startOnLoad: false, theme: 'dark',
    themeVariables: {
      primaryColor: '#2a3555', primaryBorderColor: '#5b8def',
      primaryTextColor: '#e1e4ed', lineColor: '#5b8def', fontSize: '14px'
    },
    flowchart: { useMaxWidth: false, htmlLabels: false, curve: 'basis' },
    sequence: { useMaxWidth: false }
  });

  // 提取 markdown → 设标题 → 解析 → 渲染
  const markdown = extractMarkdown();
  const h1Match = markdown.match(/^# +(.+)/m);
  if (h1Match) document.title = h1Match[1];

  const rendered = marked.parse(markdown);
  document.head.appendChild(styles());
  document.body.innerHTML = buildLayout(rendered);

  // 字号/主题控件 + 后处理
  initControls();
  requestAnimationFrame(postProcess);
}).catch((e) => {
  document.body.innerHTML = '<pre style="color:red;padding:2rem;white-space:pre-wrap">enhanced-doc 加载失败:\n' + e.message + '</pre>';
});

// ═══════════════════════════════════════════════════════════
// 以下为渲染逻辑（与原版一致，内联以避免额外请求）
// ═══════════════════════════════════════════════════════════

function escapeText(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function extractMarkdown() {
  const el = document.querySelector('script[type="text/x-markdown"]');
  return el ? el.textContent : '';
}

// :::mermaid 标记正则
const MERMAID_START_RE = /^:::\s*mermaid\s*\n/;
const MERMAID_RE = /^:::\s*mermaid\s*\n([\s\S]*?)\n:::/;

// :::chart 标记正则
const CHART_START_RE = /^:::\s*chart\s*\n/;
const CHART_RE = /^:::\s*chart\s*\n([\s\S]*?)\n:::/;

// !!! 提示框正则
const ADMONITION_START_RE = /^!!!\s+(\w+)\s+/;
const ADMONITION_RE = /^!!!\s+(Tip|Warning|Note|Error)\s*(.*?)\n((?:[ \t]{4,}.*\n?)*)/;

// ── 注册 marked 扩展 ──
function registerMarkedExtensions() {
  // :::mermaid
  marked.use({ extensions: [{
    name: 'edMermaid', level: 'block',
    start: function(src) { return src.match(MERMAID_START_RE)?.index; },
    tokenizer: function(src) {
      const m = src.match(MERMAID_RE);
      if (!m) return;
      return { type: 'edMermaid', raw: m[0], text: m[1] };
    },
    renderer: function(token) {
      return '<div class="ed-mermaid" style="text-align:center;min-height:60px;margin:16px 0">'
        + escapeText(token.text) + '</div>';
    }
  }]});

  // :::chart
  marked.use({ extensions: [{
    name: 'edChart', level: 'block',
    start: function(src) { return src.match(CHART_START_RE)?.index; },
    tokenizer: function(src) {
      const m = src.match(CHART_RE);
      if (!m) return;
      return { type: 'edChart', raw: m[0], text: m[1] };
    },
    renderer: function(token) {
      return '<div class="ed-chart" style="width:100%;height:450px;margin:20px 0">'
        + escapeText(token.text) + '</div>';
    }
  }]});

  // !!! 提示框
  marked.use({ extensions: [{
    name: 'edAdmonition', level: 'block',
    start: function(src) { return src.match(ADMONITION_START_RE)?.index; },
    tokenizer: function(src) {
      const m = src.match(ADMONITION_RE);
      if (!m) return;
      return {
        type: 'edAdmonition', raw: m[0],
        kind: m[1].toLowerCase(), title: m[2].trim(),
        body: m[3].replace(/^[ \t]{4}/gm, '')
      };
    },
    renderer: function(token) {
      const iconMap = { tip: '💡', warning: '⚠️', note: '📝', error: '🚫' };
      const icon = iconMap[token.kind] || '';
      const titleHTML = token.title
        ? '<div class="admonition-title">' + icon + ' ' + token.title + '</div>'
        : '<div class="admonition-title">' + icon + '</div>';
      return '<div class="ed-admonition admonition-' + token.kind + '">'
        + titleHTML
        + '<div class="admonition-body">' + marked.parse(token.body) + '</div>'
        + '</div>';
    }
  }]});
}

// ── 内联样式 ──
function styles() {
  const s = document.createElement('style');
  s.textContent = `.layout{display:flex;max-width:1400px;margin:0 auto}
#toc{display:block;width:240px;flex-shrink:0;position:sticky;top:1rem;align-self:flex-start;max-height:calc(100vh - 2rem);overflow-y:auto;padding:1rem 1.25rem;margin-top:1rem;border-right:1px solid var(--pico-muted-border-color)}
#content{flex:1;min-width:0;padding:1rem 2rem 3rem}
#toc ul,#toc ol{padding:0;margin:0;list-style:none}
#toc li{padding:0;margin:0;list-style:none;display:block}
#toc>.toc-title{font-weight:700;margin-bottom:.75rem;padding-bottom:.5rem;border-bottom:1px solid var(--pico-muted-border-color)}
.toc-link{color:var(--pico-muted-color);text-decoration:none;display:block;padding:.28rem 0;border-radius:4px;transition:color .15s}
.toc-link:hover{color:var(--pico-color)}
.is-active-link{color:var(--pico-primary)!important;font-weight:600}
.toc-list{list-style:none;padding:0;margin:0;font-size:.88rem}
.toc-list .toc-list{padding-left:1rem}
.is-collapsible>.toc-link{cursor:pointer}
.is-collapsible>.toc-link::before{content:"▾ ";font-size:.75rem}
.is-collapsible.is-collapsed>.toc-link::before{content:"▸ "}
.is-collapsed>.toc-list{display:none}
.toc-link::before{display:inline-block;width:1em;content:""}
.toc-link.node-name--H2{font-weight:600}
.toc-link.node-name--H3{font-size:.85rem}
.toc-link.node-name--H4,.toc-link.node-name--H5,.toc-link.node-name--H6{font-size:.78rem}
#toc a.toc-h3{padding-left:16px;font-size:13px}
.ed-admonition{border-radius:8px;padding:0.5em 1em;margin:0.8em 0;border-left:4px solid #888}
.admonition-tip{border-left-color:#4caf50;background:rgba(76,175,80,0.1)}
.admonition-warning{border-left-color:#ff9800;background:rgba(255,152,0,0.1)}
.admonition-note{border-left-color:#2196f3;background:rgba(33,150,243,0.1)}
.admonition-error{border-left-color:#f44336;background:rgba(244,67,54,0.1)}
.admonition-title{font-weight:bold;margin-bottom:4px}
.admonition-body>:last-child{margin-bottom:0}
.ed-mermaid,.ed-chart{background:var(--pico-card-background-color,transparent);border-radius:8px;padding:8px}
.mermaid{width:100%;overflow:auto}
.mermaid svg{cursor:grab;display:block}
h2.ed-collapsible,h3.ed-collapsible,h4.ed-collapsible,h5.ed-collapsible,h6.ed-collapsible{cursor:pointer;user-select:none}
h2.ed-collapsible::before,h3.ed-collapsible::before,h4.ed-collapsible::before,h5.ed-collapsible::before,h6.ed-collapsible::before{content:"▾ ";font-size:.75em}
h2.ed-collapsed::before,h3.ed-collapsed::before,h4.ed-collapsed::before,h5.ed-collapsed::before,h6.ed-collapsed::before{content:"▸ "}
.ed-section.ed-collapsed{display:none}
.ed-section-l3{margin-left:1rem}
#ed-fontbar{position:fixed;bottom:20px;right:20px;display:flex;gap:4px;z-index:100;background:var(--pico-card-background-color);border:1px solid var(--pico-muted-border-color);border-radius:8px;padding:4px 8px;font-size:13px;color:var(--pico-muted-color);box-shadow:0 2px 8px rgba(0,0,0,.3)}
#ed-fontbar button{background:none;border:none;color:var(--pico-muted-color);cursor:pointer;font-size:16px;padding:0 6px;line-height:1}
#ed-fontbar button:hover{color:var(--pico-primary)}
#ed-fontbar .ed-fs-label{min-width:36px;text-align:center;line-height:24px}
@media(max-width:800px){.layout{flex-direction:column}#toc{position:static;max-height:none;width:100%;border-right:none;border-bottom:1px solid var(--pico-muted-border-color)}#content{padding:1rem}}
@media print{#toc{display:none!important}}`;
  return s;
}

// ── 构建页面布局 ──
function buildLayout(contentHTML) {
  return '<div class="layout"><nav id="toc"></nav><main id="content">' + contentHTML + '</main></div>'
    + '<div id="ed-fontbar">'
    + '<button id="ed-fs-down" title="缩小字号">A−</button>'
    + '<span class="ed-fs-label" id="ed-fs-label">100%</span>'
    + '<button id="ed-fs-up" title="放大字号">A+</button>'
    + '<span style="margin:0 4px;color:var(--pico-muted-border-color)">|</span>'
    + '<button id="ed-theme-btn" title="切换主题" style="font-size:18px">☾</button>'
    + '</div>';
}

// ── Mermaid SVG 后处理（样式 + svgPanZoom 初始化）──
function postProcessMermaidSvg(svg) {
  let w, h;
  const vb = svg.getAttribute('viewBox');
  const sw = svg.getAttribute('width');
  const sh = svg.getAttribute('height');
  if (vb) {
    const vbParts = vb.split(/\s+/); w = parseFloat(vbParts[2]); h = parseFloat(vbParts[3]);
  } else if (sw && sw !== '100%' && sh) {
    w = parseFloat(sw); h = parseFloat(sh);
  } else {
    try { const bb = svg.getBBox(); w = bb.width; h = bb.height; } catch(e) {}
  }
  svg.style.overflow = 'visible';
  svg.style.width = '100%';
  svg.style.maxWidth = '100%';

  if (w && h && w > 0 && h > 0) {
    const ratio = w / h;
    const container = svg.closest('.mermaid');
    if (container) {
      const cw = container.clientWidth || MERMAID_FALLBACK_WIDTH;
      let idealH = cw / ratio;
      idealH = Math.max(cw * MERMAID_MIN_HEIGHT_RATIO, Math.min(idealH, cw * MERMAID_MAX_HEIGHT_RATIO));
      container.style.minHeight = idealH + 'px';
      container.style.maxHeight = (cw * MERMAID_MAX_HEIGHT_RATIO) + 'px';
    }
  }
  if (!svg.getAttribute('height')) {
    try {
      const g = svg.querySelector('g');
      if (g) {
        const bb = g.getBBox();
        if (bb && bb.height > 0) {
          svg.setAttribute('height', Math.ceil(bb.height + bb.y + 10));
        }
      }
    } catch(e) {}
  }
  try { svgPanZoom(svg, { zoomEnabled: true, controlIconsEnabled: false,
    fit: true, center: true, minZoom: 0.25, maxZoom: 5 }); } catch(e) {}
}

// ── Mermaid 渲染 ──
function renderMermaids() {
  document.querySelectorAll('.ed-mermaid').forEach((el) => {
    const div = document.createElement('div');
    div.className = 'mermaid';
    div.textContent = el.textContent;
    div.setAttribute('data-mermaid-src', el.textContent);
    el.replaceWith(div);
  });
  if (document.querySelector('.mermaid')) {
    mermaid.run({ querySelector: '.mermaid' }).then(() => {
      document.querySelectorAll('.mermaid svg').forEach(postProcessMermaidSvg);
    }).catch((e) => { console.warn('enhanced-doc: Mermaid 渲染失败:', e.message); });
  }
}

// ── ECharts 渲染 ──
function renderCharts() {
  document.querySelectorAll('.ed-chart').forEach((el) => {
    try {
      const opt = JSON.parse(el.textContent.trim());
      if (!opt.grid) { opt.grid = {}; }
      if (opt.grid.top === undefined)    { opt.grid.top = CHART_GRID.top; }
      if (opt.grid.bottom === undefined) { opt.grid.bottom = CHART_GRID.bottom; }
      if (opt.grid.left === undefined)   { opt.grid.left = CHART_GRID.left; }
      if (opt.grid.right === undefined)  { opt.grid.right = CHART_GRID.right; }
      if (opt.backgroundColor === undefined) { opt.backgroundColor = 'transparent'; }
      const chart = echarts.init(el);
      chart.setOption(opt);
      window.addEventListener('resize', () => { chart.resize(); });
    } catch(e) {
      el.innerHTML = '<pre style="color:#c88;padding:12px">图表配置解析失败: '
        + e.message + '\n\n' + el.textContent + '</pre>';
    }
  });
}

// ── 侧边目录 ──
function initTOC() {
  tocbot.init({
    tocSelector: '#toc', contentSelector: '#content',
    headingSelector: 'h2, h3', hasInnerContainers: true,
    collapseDepth: 6, scrollSmooth: true, headingsOffset: 40
  });
  const toc = document.getElementById('toc');
  if (toc) {
    const ttitle = document.createElement('div');
    ttitle.className = 'toc-title'; ttitle.textContent = '\u{1F4D1} 目录';
    toc.insertBefore(ttitle, toc.firstChild);
    toc.querySelectorAll('.toc-list-item').forEach((li) => {
      if (li.querySelector('.toc-list')) li.classList.add('is-collapsible');
    });
    toc.addEventListener('click', (e) => {
      const link = e.target.closest('.toc-link');
      if (!link) return;
      const li = link.parentElement;
      if (li.classList.contains('is-collapsible')) { e.preventDefault(); li.classList.toggle('is-collapsed'); }
    });
  }
}

// ── 后处理器 ──
function postProcess() {
  renderMermaids();
  renderCharts();
  initTOC();
  enableContentCollapse();
  if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
    MathJax.typesetPromise().catch(() => {});
  }
}

// ── 正文章节折叠 ──
function enableContentCollapse() {
  const content = document.getElementById('content');
  if (!content) return;
  function wrapLevel(container, level) {
    if (level > 6) return;
    const tag = 'H' + level;
    container.querySelectorAll(':scope > ' + tag).forEach((h) => {
      const bodyNodes = [];
      let sibling = h.nextElementSibling;
      while (sibling) {
        const sl = parseInt(sibling.tagName.substring(1), 10);
        if (sl && sl <= level) break;
        bodyNodes.push(sibling); sibling = sibling.nextElementSibling;
      }
      if (bodyNodes.length === 0) return;
      const wrapper = document.createElement('div');
      wrapper.className = 'ed-section ed-section-l' + level;
      bodyNodes.forEach((n) => { wrapper.appendChild(n); });
      h.after(wrapper);
      h.classList.add('ed-collapsible');
      h.addEventListener('click', () => {
        const wasCollapsed = h.classList.contains('ed-collapsed');
        h.classList.toggle('ed-collapsed');
        wrapper.classList.toggle('ed-collapsed');
        if (wasCollapsed && typeof echarts !== 'undefined') {
          resizeAllCharts(wrapper);
        }
      });
      wrapLevel(wrapper, level + 1);
    });
  }
  wrapLevel(content, 2);
}

// ── 重绘所有图表 ──
function resizeAllCharts(root) {
  (root || document).querySelectorAll('.ed-chart').forEach((el) => {
    const inst = echarts.getInstanceByDom(el);
    if (inst) setTimeout(() => { inst.resize(); }, 100);
  });
}

// ── 控件初始化（字号/主题） ──
function initControls() {
  const fSizes = [8, 12, 16, 20, 24, 28, 32];
  let fIdx = 2;
  function applyFontSize() {
    const px = fSizes[fIdx];
    document.documentElement.style.fontSize = px + 'px';
    document.getElementById('ed-fs-label').textContent = Math.round(px / 16 * 100) + '%';
    resizeAllCharts();
  }
  document.getElementById('ed-fs-up').addEventListener('click', () => {
    fIdx = Math.min(fIdx + 1, fSizes.length - 1); applyFontSize();
  });
  document.getElementById('ed-fs-down').addEventListener('click', () => {
    fIdx = Math.max(fIdx - 1, 0); applyFontSize();
  });

  let ED_THEME = 'dark';
  let mermaidRerenderIdx = 0;
  const MERMAID_THEMES = {
    dark:  { theme: 'dark',    themeVariables: { fontSize: '14px' } },
    light: { theme: 'default', themeVariables: { fontSize: '14px' } }
  };
  document.getElementById('ed-theme-btn').addEventListener('click', () => {
    ED_THEME = ED_THEME === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = ED_THEME;
    document.getElementById('ed-theme-btn').textContent = ED_THEME === 'dark' ? '☾' : '☀';
    mermaid.initialize({ startOnLoad: false, ...MERMAID_THEMES[ED_THEME] });
    document.querySelectorAll('.mermaid').forEach((el) => {
      const graph = el.getAttribute('data-mermaid-src');
      if (!graph) return;
      const oldSvg = el.querySelector('svg');
      if (oldSvg) {
        try { svgPanZoom(oldSvg).destroy(); } catch(e) {}
      }
      mermaid.render('mermaid-rerender-' + (++mermaidRerenderIdx), graph).then((r) => {
        el.innerHTML = r.svg;
        const svg = el.querySelector('svg');
        if (svg) postProcessMermaidSvg(svg);
      }).catch((e) => { console.warn('enhanced-doc: Mermaid 主题切换失败:', e); });
    });
    const chartBg = ED_THEME === 'dark' ? 'transparent' : '#f8f9fa';
    document.querySelectorAll('.ed-chart').forEach((el) => {
      const inst = echarts.getInstanceByDom(el);
      if (inst) inst.setOption({ backgroundColor: chartBg }, false);
    });
    resizeAllCharts();
  });
}

// 导出可测接口（仅开发/测试使用）
window.__enhancedDoc = {
  escapeText, buildLayout, styles,
  MERMAID_START_RE, MERMAID_RE,
  CHART_START_RE, CHART_RE,
  ADMONITION_START_RE, ADMONITION_RE,
  resizeAllCharts,
};

})();
