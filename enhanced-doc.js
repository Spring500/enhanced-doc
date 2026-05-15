// enhanced-doc.js — 增强 Markdown 文档渲染引擎 (v2)
// 自注入所有 CDN 依赖。模板只需两个 <script> 块：
//   1. <script type="text/x-markdown">  — 正文
//   2. <script src="enhanced-doc.js">  — 本文件

(function() {
'use strict';

var CDN = 'https://cdn.jsdelivr.net/npm';

// ═══ 工具：动态加载 JS / CSS ═══
function loadJS(src) {
  return new Promise(function(resolve, reject) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = function() { reject(new Error('加载失败: ' + src)); };
    document.head.appendChild(s);
  });
}

function loadCSS(href) {
  return new Promise(function(resolve, reject) {
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    l.onload = resolve;
    l.onerror = function() { reject(new Error('CSS 加载失败: ' + href)); };
    document.head.appendChild(l);
  });
}

// ═══ 设置暗色主题 ═══
document.documentElement.dataset.theme = 'dark';

// ═══ 1. 串行加载 marked → marked-gfm-heading-id ═══
loadJS(CDN + '/marked/marked.min.js').then(function() {

  // ── 注册 marked 自定义扩展 ──
  registerMarkedExtensions();

  return loadJS(CDN + '/marked-gfm-heading-id/lib/index.umd.js');
}).then(function() {

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
}).then(function() {

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
  var markdown = extractMarkdown();
  var h1Match = markdown.match(/^# +(.+)/m);
  if (h1Match) document.title = h1Match[1];

  var rendered = marked.parse(markdown);
  document.head.appendChild(styles());
  document.body.innerHTML = buildLayout(rendered);

  // 字号/主题控件 + 后处理
  initControls();
  setTimeout(postProcess, 600);
}).catch(function(e) {
  document.body.innerHTML = '<pre style="color:red;padding:2rem;white-space:pre-wrap">enhanced-doc 加载失败:\n' + e.message + '</pre>';
});

// ═══════════════════════════════════════════════════════════
// 以下为渲染逻辑（与原版一致，内联以避免额外请求）
// ═══════════════════════════════════════════════════════════

function escapeText(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function extractMarkdown() {
  var el = document.querySelector('script[type="text/x-markdown"]');
  return el ? el.textContent : '';
}

// ── 注册 marked 扩展 ──
function registerMarkedExtensions() {
  // :::mermaid
  marked.use({ extensions: [{
    name: 'edMermaid', level: 'block',
    start: function(src) { return src.match(/^:::\s*mermaid\s*\n/)?.index; },
    tokenizer: function(src) {
      var m = src.match(/^:::\s*mermaid\s*\n([\s\S]*?)\n:::/);
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
    start: function(src) { return src.match(/^:::\s*chart\s*\n/)?.index; },
    tokenizer: function(src) {
      var m = src.match(/^:::\s*chart\s*\n([\s\S]*?)\n:::/);
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
    start: function(src) { return src.match(/^!!!\s+(\w+)\s+/)?.index; },
    tokenizer: function(src) {
      var m = src.match(/^!!!\s+(Tip|Warning|Note|Error)\s*(.*?)\n((?:[ \t]{4,}.*\n?)*)/);
      if (!m) return;
      return {
        type: 'edAdmonition', raw: m[0],
        kind: m[1].toLowerCase(), title: m[2].trim(),
        body: m[3].replace(/^[ \t]{4}/gm, '')
      };
    },
    renderer: function(token) {
      var iconMap = { tip: '💡', warning: '⚠️', note: '📝', error: '🚫' };
      var icon = iconMap[token.kind] || '';
      var titleHTML = token.title
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
  var s = document.createElement('style');
  s.textContent = [
    '.layout{display:flex;max-width:1400px;margin:0 auto}',
    '#toc{display:block;width:240px;flex-shrink:0;position:sticky;top:1rem;align-self:flex-start;max-height:calc(100vh - 2rem);overflow-y:auto;padding:1rem 1.25rem;margin-top:1rem;border-right:1px solid var(--pico-muted-border-color)}',
    '#content{flex:1;min-width:0;padding:1rem 2rem 3rem}',
    '#toc ul,#toc ol{padding:0;margin:0;list-style:none}',
    '#toc li{padding:0;margin:0;list-style:none;display:block}',
    '#toc>.toc-title{font-weight:700;margin-bottom:.75rem;padding-bottom:.5rem;border-bottom:1px solid var(--pico-muted-border-color)}',
    '.toc-link{color:var(--pico-muted-color);text-decoration:none;display:block;padding:.28rem 0;border-radius:4px;transition:color .15s}',
    '.toc-link:hover{color:var(--pico-color)}',
    '.is-active-link{color:var(--pico-primary)!important;font-weight:600}',
    '.toc-list{list-style:none;padding:0;margin:0;font-size:.88rem}',
    '.toc-list .toc-list{padding-left:1rem}',
    '.is-collapsible>.toc-link{cursor:pointer}',
    '.is-collapsible>.toc-link::before{content:"▾ ";font-size:.75rem}',
    '.is-collapsible.is-collapsed>.toc-link::before{content:"▸ "}',
    '.is-collapsed>.toc-list{display:none}',
    '.toc-link::before{display:inline-block;width:1em;content:""}',
    '.toc-link.node-name--H2{font-weight:600}',
    '.toc-link.node-name--H3{font-size:.85rem}',
    '.toc-link.node-name--H4,.toc-link.node-name--H5,.toc-link.node-name--H6{font-size:.78rem}',
    '#toc a.toc-h3{padding-left:16px;font-size:13px}',
    '.ed-admonition{border-radius:8px;padding:0.5em 1em;margin:0.8em 0;border-left:4px solid #888}',
    '.admonition-tip{border-left-color:#4caf50;background:rgba(76,175,80,0.1)}',
    '.admonition-warning{border-left-color:#ff9800;background:rgba(255,152,0,0.1)}',
    '.admonition-note{border-left-color:#2196f3;background:rgba(33,150,243,0.1)}',
    '.admonition-error{border-left-color:#f44336;background:rgba(244,67,54,0.1)}',
    '.admonition-title{font-weight:bold;margin-bottom:4px}',
    '.admonition-body>:last-child{margin-bottom:0}',
    '.ed-mermaid,.ed-chart{background:var(--pico-card-background-color,transparent);border-radius:8px;padding:8px}',
    '.mermaid{width:100%;overflow:auto}',
    '.mermaid svg{cursor:grab;display:block}',
    'h2.ed-collapsible,h3.ed-collapsible,h4.ed-collapsible,h5.ed-collapsible,h6.ed-collapsible{cursor:pointer;user-select:none}',
    'h2.ed-collapsible::before,h3.ed-collapsible::before,h4.ed-collapsible::before,h5.ed-collapsible::before,h6.ed-collapsible::before{content:"▾ ";font-size:.75em}',
    'h2.ed-collapsed::before,h3.ed-collapsed::before,h4.ed-collapsed::before,h5.ed-collapsed::before,h6.ed-collapsed::before{content:"▸ "}',
    '.ed-section.ed-collapsed{display:none}',
    '.ed-section-l3{margin-left:1rem}',
    '#ed-fontbar{position:fixed;bottom:20px;right:20px;display:flex;gap:4px;z-index:100;background:var(--pico-card-background-color);border:1px solid var(--pico-muted-border-color);border-radius:8px;padding:4px 8px;font-size:13px;color:var(--pico-muted-color);box-shadow:0 2px 8px rgba(0,0,0,.3)}',
    '#ed-fontbar button{background:none;border:none;color:var(--pico-muted-color);cursor:pointer;font-size:16px;padding:0 6px;line-height:1}',
    '#ed-fontbar button:hover{color:var(--pico-primary)}',
    '#ed-fontbar .ed-fs-label{min-width:36px;text-align:center;line-height:24px}',
    '@media(max-width:800px){.layout{flex-direction:column}#toc{position:static;max-height:none;width:100%;border-right:none;border-bottom:1px solid var(--pico-muted-border-color)}#content{padding:1rem}}',
    '@media print{#toc{display:none!important}}'
  ].join('');
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

// ── 后处理器 ──
function postProcess() {
  // Mermaid 渲染
  document.querySelectorAll('.ed-mermaid').forEach(function(el) {
    var div = document.createElement('div');
    div.className = 'mermaid';
    div.textContent = el.textContent;
    div.setAttribute('data-mermaid-src', el.textContent);
    el.replaceWith(div);
  });
  if (document.querySelector('.mermaid')) {
    mermaid.run({ querySelector: '.mermaid' }).then(function() {
      document.querySelectorAll('.mermaid svg').forEach(function(svg) {
        // 根据 SVG 尺寸动态设定容器高度（限制在 0.5x ~ 2x 容器宽之间）
        var w, h;
        var vb = svg.getAttribute('viewBox');
        var sw = svg.getAttribute('width');
        var sh = svg.getAttribute('height');
        if (vb) {
          var vbParts = vb.split(/\s+/); w = parseFloat(vbParts[2]); h = parseFloat(vbParts[3]);
        } else if (sw && sw !== '100%' && sh) {
          w = parseFloat(sw); h = parseFloat(sh);
        } else {
          try { var bb = svg.getBBox(); w = bb.width; h = bb.height; } catch(e) {}
        }
        // 去掉 SVG 自带的 overflow:hidden（Mermaid 用它裁切内容）
        svg.style.overflow = 'visible';
        // 宽度填满容器但不溢出
        svg.style.width = '100%';
        svg.style.maxWidth = '100%';

        if (w && h && w > 0 && h > 0) {
          var ratio = w / h;
          var container = svg.closest('.mermaid');
          if (container) {
            var cw = container.clientWidth || 700;
            // 按图比例算高度，clamp 在容器宽的 0.5x ~ 2x 之间
            var idealH = cw / ratio;
            idealH = Math.max(cw * 0.5, Math.min(idealH, cw * 2));
            container.style.minHeight = idealH + 'px';
            container.style.maxHeight = (cw * 2) + 'px';
          }
        }
        // 对无明确高度的 SVG（如 stateDiagram），用内容实际高度回退
        if (!svg.getAttribute('height')) {
          try {
            var g = svg.querySelector('g');
            if (g) {
              var bb = g.getBBox();
              if (bb && bb.height > 0) {
                svg.setAttribute('height', Math.ceil(bb.height + bb.y + 10));
              }
            }
          } catch(e) {}
        }
        try { svgPanZoom(svg, { zoomEnabled: true, controlIconsEnabled: false,
          fit: true, center: true, minZoom: 0.25, maxZoom: 5 }); } catch(e) {}
      });
    }).catch(function(e) { console.warn('enhanced-doc: Mermaid 渲染失败:', e.message); });
  }

  // ECharts 渲染
  document.querySelectorAll('.ed-chart').forEach(function(el) {
    try {
      var opt = JSON.parse(el.textContent.trim());
      if (!opt.grid) { opt.grid = {}; }
      if (opt.grid.top === undefined)    { opt.grid.top = 70; }
      if (opt.grid.bottom === undefined) { opt.grid.bottom = 40; }
      if (opt.grid.left === undefined)   { opt.grid.left = 50; }
      if (opt.grid.right === undefined)  { opt.grid.right = 20; }
      if (opt.backgroundColor === undefined) { opt.backgroundColor = 'transparent'; }
      var chart = echarts.init(el);
      chart.setOption(opt);
      window.addEventListener('resize', function() { chart.resize(); });
    } catch(e) {
      el.innerHTML = '<pre style="color:#c88;padding:12px">图表配置解析失败: '
        + e.message + '\n\n' + el.textContent + '</pre>';
    }
  });

  // 侧边目录
  tocbot.init({
    tocSelector: '#toc', contentSelector: '#content',
    headingSelector: 'h2, h3', hasInnerContainers: true,
    collapseDepth: 6, scrollSmooth: true, headingsOffset: 40
  });
  var toc = document.getElementById('toc');
  if (toc) {
    var ttitle = document.createElement('div');
    ttitle.className = 'toc-title'; ttitle.textContent = '\u{1F4D1} 目录';
    toc.insertBefore(ttitle, toc.firstChild);
    toc.querySelectorAll('.toc-list-item').forEach(function(li) {
      if (li.querySelector('.toc-list')) li.classList.add('is-collapsible');
    });
    toc.addEventListener('click', function(e) {
      var link = e.target.closest('.toc-link');
      if (!link) return;
      var li = link.parentElement;
      if (li.classList.contains('is-collapsible')) { e.preventDefault(); li.classList.toggle('is-collapsed'); }
    });
  }

  // 正文章节折叠
  enableContentCollapse();

  // MathJax 重新排版（body 替换后）
  if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
    MathJax.typesetPromise().catch(function() {});
  }
}

// ── 正文章节折叠 ──
function enableContentCollapse() {
  var content = document.getElementById('content');
  if (!content) return;
  function wrapLevel(container, level) {
    if (level > 6) return;
    var tag = 'H' + level;
    container.querySelectorAll(':scope > ' + tag).forEach(function(h) {
      var bodyNodes = [], sibling = h.nextElementSibling;
      while (sibling) {
        var sl = parseInt(sibling.tagName.substring(1));
        if (sl && sl <= level) break;
        bodyNodes.push(sibling); sibling = sibling.nextElementSibling;
      }
      if (bodyNodes.length === 0) return;
      var wrapper = document.createElement('div');
      wrapper.className = 'ed-section ed-section-l' + level;
      bodyNodes.forEach(function(n) { wrapper.appendChild(n); });
      h.after(wrapper);
      h.classList.add('ed-collapsible');
      h.addEventListener('click', function() {
        var wasCollapsed = h.classList.contains('ed-collapsed');
        h.classList.toggle('ed-collapsed');
        wrapper.classList.toggle('ed-collapsed');
        if (wasCollapsed && typeof echarts !== 'undefined') {
          wrapper.querySelectorAll('.ed-chart').forEach(function(el) {
            var inst = echarts.getInstanceByDom(el);
            if (inst) setTimeout(function() { inst.resize(); }, 100);
          });
        }
      });
      wrapLevel(wrapper, level + 1);
    });
  }
  wrapLevel(content, 2);
}

// ── 控件初始化（字号/主题） ──
function initControls() {
  var fSizes = [8, 12, 16, 20, 24, 28, 32], fIdx = 2;
  function applyFontSize() {
    var px = fSizes[fIdx];
    document.documentElement.style.fontSize = px + 'px';
    document.getElementById('ed-fs-label').textContent = Math.round(px / 16 * 100) + '%';
    document.querySelectorAll('.ed-chart').forEach(function(el) {
      var inst = echarts.getInstanceByDom(el);
      if (inst) setTimeout(function() { inst.resize(); }, 100);
    });
  }
  document.getElementById('ed-fs-up').addEventListener('click', function() {
    fIdx = Math.min(fIdx + 1, fSizes.length - 1); applyFontSize();
  });
  document.getElementById('ed-fs-down').addEventListener('click', function() {
    fIdx = Math.max(fIdx - 1, 0); applyFontSize();
  });

  var ED_THEME = 'dark', mermaidRerenderIdx = 0;
  var MERMAID_THEMES = {
    dark:  { theme: 'dark',    themeVariables: { fontSize: '14px' } },
    light: { theme: 'default', themeVariables: { fontSize: '14px' } }
  };
  document.getElementById('ed-theme-btn').addEventListener('click', function() {
    ED_THEME = ED_THEME === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = ED_THEME;
    document.getElementById('ed-theme-btn').textContent = ED_THEME === 'dark' ? '☾' : '☀';
    mermaid.initialize(Object.assign({ startOnLoad: false }, MERMAID_THEMES[ED_THEME]));
    document.querySelectorAll('.mermaid').forEach(function(el) {
      var graph = el.getAttribute('data-mermaid-src');
      if (!graph) return;
      mermaid.render('mermaid-rerender-' + (++mermaidRerenderIdx), graph).then(function(r) {
        el.innerHTML = r.svg;
      }).catch(function(e) { console.warn('enhanced-doc: Mermaid 主题切换失败:', e); });
    });
    var chartBg = ED_THEME === 'dark' ? 'transparent' : '#f8f9fa';
    document.querySelectorAll('.ed-chart').forEach(function(el) {
      var inst = echarts.getInstanceByDom(el);
      if (inst) { inst.setOption({ backgroundColor: chartBg }, false); setTimeout(function() { inst.resize(); }, 100); }
    });
  });
}

})();
