// enhanced-doc.js — 增强 Markdown 文档渲染引擎

(function() {
'use strict';
console.log('ENHANCED-DOC: running, marked=' + typeof marked);

if (typeof marked === 'undefined') {
  console.error('enhanced-doc: marked.js 未加载，请检查 CDN 引用');
  return;
}

var hasTocbot = typeof tocbot !== 'undefined';
var hasPanzoom = typeof svgPanZoom !== 'undefined';

// ================================================================
// 1. marked.js 自定义扩展
// ================================================================

// ── :::mermaid 容器 ──
marked.use({ extensions: [{
  name: 'edMermaid',
  level: 'block',
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

// ── :::chart 容器 ──
// 未来扩展：:::widget 容器（允许内嵌可执行 <script>，支持交互式控件）
// 实现方式：enhanced-doc.js 在 postProcess 阶段扫描 .ed-widget 元素，
// 用 Function() 执行其内部的 <script> 内容，实现 tab/计数器/拖拽等交互。
marked.use({ extensions: [{
  name: 'edChart',
  level: 'block',
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

// ── !!! 提示框 ──
marked.use({ extensions: [{
  name: 'edAdmonition',
  level: 'block',
  start: function(src) { return src.match(/^!!!\s+(\w+)\s+/)?.index; },
  tokenizer: function(src) {
    var m = src.match(
      /^!!!\s+(Tip|Warning|Note|Error)\s*(.*?)\n((?:[ \t]{4,}.*\n?)*)/
    );
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

// ================================================================
// 2. GitHub 风格 Heading ID（修复 tocbot 锚点跳转）
// ================================================================

if (typeof markedGfmHeadingId !== 'undefined') {
  marked.use(markedGfmHeadingId.gfmHeadingId());
}

// ================================================================
// 3. 工具函数
// ================================================================

function escapeText(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ================================================================
// 4. 提取 Markdown 正文（enhanced-doc.js <script> 之前的 body 内容）
// ================================================================

function extractMarkdown() {
  var body = document.body, parts = [];
  for (var i = 0; i < body.childNodes.length; i++) {
    var node = body.childNodes[i];
    if (node.tagName === 'SCRIPT' && node.src && node.src.indexOf('enhanced-doc.js') !== -1) break;
    if (node.nodeType === 3) { parts.push(node.textContent); }
    else if (node.nodeType === 1 && node.tagName !== 'SCRIPT') { parts.push(node.outerHTML); }
  }
  return parts.join('');
}

// ================================================================
// 5. 后处理器（延迟到 window.load 之后）
// ================================================================

function postProcess() {
  // ── Mermaid 渲染 ──
  document.querySelectorAll('.ed-mermaid').forEach(function(el) {
    var div = document.createElement('div');
    div.className = 'mermaid';
    div.textContent = el.textContent;
    div.setAttribute('data-mermaid-src', el.textContent);
    el.replaceWith(div);
  });
  if (document.querySelector('.mermaid')) {
    mermaid.run({ querySelector: '.mermaid' }).then(function() {
      if (hasPanzoom) {
        document.querySelectorAll('.mermaid svg').forEach(function(svg) {
          try { svgPanZoom(svg, { zoomEnabled: true, controlIconsEnabled: false,
            fit: true, center: true, minZoom: 0.25, maxZoom: 5 }); } catch(e) {}
        });
      }
    }).catch(function(e) { console.warn('enhanced-doc: Mermaid 渲染失败:', e.message); });
  }

  // ── ECharts 渲染（自动注入 grid 默认值防止重叠） ──
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

  // ── 侧边目录（tocbot / fallback） ──
  if (hasTocbot) {
    var headingsFound = [];
    for (var lv = 2; lv <= 6; lv++) {
      if (document.querySelector('#content h' + lv)) headingsFound.push('h' + lv);
    }
    tocbot.init({
      tocSelector: '#toc', contentSelector: '#content',
      headingSelector: headingsFound.length > 0 ? headingsFound.join(', ') : 'h2, h3',
      hasInnerContainers: true, collapseDepth: 6, scrollSmooth: true, headingsOffset: 40
    });
    var toc = document.getElementById('toc');
    if (toc) {
      var title = document.createElement('div');
      title.className = 'toc-title'; title.textContent = '\u{1F4D1} 目录';
      toc.insertBefore(title, toc.firstChild);
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
  } else { buildSimpleTOC(); }

  // ── 正文章节折叠（h2~h6 递归层级） ──
  enableContentCollapse();
}

// ================================================================
// 6. 正文章节折叠
// ================================================================

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

function buildSimpleTOC() {
  var sidebar = document.getElementById('toc');
  if (!sidebar) return;
  var html = '<div class="toc-title">目录</div>', count = 0;
  document.querySelectorAll('#content h2, #content h3').forEach(function(h, i) {
    if (!h.id) h.id = 'sec-' + i;
    html += '<a href="#' + h.id + '" class="toc-' + h.tagName.toLowerCase() + '">' + h.textContent + '</a>';
    count++;
  });
  if (count === 0) { sidebar.style.display = 'none'; return; }
  sidebar.innerHTML = html;
}

// ================================================================
// 7. 渲染文档 → 注入布局 + UI → 延迟后处理
// ================================================================

var markdown = extractMarkdown();
var rendered = marked.parse(markdown);

var styleTag = document.createElement('style');
styleTag.textContent = [
  // 左右分栏
  '.layout{display:flex;max-width:1400px;margin:0 auto}',
  '#toc{display:block;width:240px;flex-shrink:0;position:sticky;top:1rem;align-self:flex-start;max-height:calc(100vh - 2rem);overflow-y:auto;padding:1rem 1.25rem;margin-top:1rem;border-right:1px solid var(--pico-muted-border-color)}',
  '#content{flex:1;min-width:0;padding:1rem 2rem 3rem}',

  // TOC 内消除 Pico 默认间距
  '#toc ul,#toc ol{padding:0;margin:0;list-style:none}',
  '#toc li{padding:0;margin:0;list-style:none;display:block}',
  '#toc>.toc-title{font-weight:700;margin-bottom:.75rem;padding-bottom:.5rem;border-bottom:1px solid var(--pico-muted-border-color)}',

  // tocbot TOC 样式
  '.toc-link{color:var(--pico-muted-color);text-decoration:none;display:block;padding:.28rem 0;border-radius:4px;transition:color .15s}',
  '.toc-link:hover{color:var(--pico-color)}',
  '.is-active-link{color:var(--pico-primary)!important;font-weight:600}',
  '.toc-list{list-style:none;padding:0;margin:0;font-size:.88rem}',
  '.toc-list .toc-list{padding-left:1rem}',

  // 折叠交互 + 对齐
  '.is-collapsible>.toc-link{cursor:pointer}',
  '.is-collapsible>.toc-link::before{content:"▾ ";font-size:.75rem}',
  '.is-collapsible.is-collapsed>.toc-link::before{content:"▸ "}',
  '.is-collapsed>.toc-list{display:none}',
  '.toc-link::before{display:inline-block;width:1em;content:""}',
  '.is-collapsible>.toc-link::before{content:"▾ "}',
  '.is-collapsible.is-collapsed>.toc-link::before{content:"▸ "}',

  // TOC 层级视觉
  '.toc-link.node-name--H2{font-weight:600}',
  '.toc-link.node-name--H3{font-size:.85rem}',
  '.toc-link.node-name--H4,.toc-link.node-name--H5,.toc-link.node-name--H6{font-size:.78rem}',
  '#toc a.toc-h3{padding-left:16px;font-size:13px}',

  // 提示框
  '.ed-admonition{border-radius:8px;padding:0.5em 1em;margin:0.8em 0;border-left:4px solid #888}',
  '.admonition-tip{border-left-color:#4caf50;background:rgba(76,175,80,0.1)}',
  '.admonition-warning{border-left-color:#ff9800;background:rgba(255,152,0,0.1)}',
  '.admonition-note{border-left-color:#2196f3;background:rgba(33,150,243,0.1)}',
  '.admonition-error{border-left-color:#f44336;background:rgba(244,67,54,0.1)}',
  '.admonition-title{font-weight:bold;margin-bottom:4px}',
  '.admonition-body>:last-child{margin-bottom:0}',

  // 图表容器
  '.ed-mermaid,.ed-chart{background:var(--pico-card-background-color,transparent);border-radius:8px;padding:8px}',
  '.mermaid svg{cursor:grab}',

  // 正文章节折叠
  'h2.ed-collapsible,h3.ed-collapsible,h4.ed-collapsible,h5.ed-collapsible,h6.ed-collapsible{cursor:pointer;user-select:none}',
  'h2.ed-collapsible::before,h3.ed-collapsible::before,h4.ed-collapsible::before,h5.ed-collapsible::before,h6.ed-collapsible::before{content:"▾ ";font-size:.75em}',
  'h2.ed-collapsed::before,h3.ed-collapsed::before,h4.ed-collapsed::before,h5.ed-collapsed::before,h6.ed-collapsed::before{content:"▸ "}',
  '.ed-section.ed-collapsed{display:none}',
  '.ed-section-l3{margin-left:1rem}',

  // 字号/主题控件
  '#ed-fontbar{position:fixed;bottom:20px;right:20px;display:flex;gap:4px;z-index:100;background:var(--pico-card-background-color);border:1px solid var(--pico-muted-border-color);border-radius:8px;padding:4px 8px;font-size:13px;color:var(--pico-muted-color);box-shadow:0 2px 8px rgba(0,0,0,.3)}',
  '#ed-fontbar button{background:none;border:none;color:var(--pico-muted-color);cursor:pointer;font-size:16px;padding:0 6px;line-height:1}',
  '#ed-fontbar button:hover{color:var(--pico-primary)}',
  '#ed-fontbar .ed-fs-label{min-width:36px;text-align:center;line-height:24px}',

  '@media(max-width:800px){.layout{flex-direction:column}#toc{position:static;max-height:none;width:100%;border-right:none;border-bottom:1px solid var(--pico-muted-border-color)}#content{padding:1rem}}',
  '@media print{#toc{display:none!important}}'
].join('');

document.body.innerHTML = ''
  + '<div class="layout"><nav id="toc"></nav><main id="content">' + rendered + '</main></div>'
  + '<div id="ed-fontbar">'
  + '<button id="ed-fs-down" title="缩小字号">A−</button>'
  + '<span class="ed-fs-label" id="ed-fs-label">100%</span>'
  + '<button id="ed-fs-up" title="放大字号">A+</button>'
  + '<span style="margin:0 4px;color:var(--pico-muted-border-color)">|</span>'
  + '<button id="ed-theme-btn" title="切换主题" style="font-size:18px">☾</button>'
  + '</div>';

document.head.appendChild(styleTag);

// ═══ 字号调节（7 档：50%/75%/100%/125%/150%/175%/200%） ═══
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
document.getElementById('ed-fs-up').addEventListener('click', function() { fIdx = Math.min(fIdx + 1, fSizes.length - 1); applyFontSize(); });
document.getElementById('ed-fs-down').addEventListener('click', function() { fIdx = Math.max(fIdx - 1, 0); applyFontSize(); });

// ═══ 主题切换（Pico + Mermaid + ECharts 联动） ═══
var ED_THEME = 'dark', mermaidRerenderIdx = 0;
var MERMAID_THEMES = {
  dark:  { theme: 'dark',    themeVariables: { fontSize: '14px' } },
  light: { theme: 'default', themeVariables: { fontSize: '14px' } }
};
function switchTheme() {
  ED_THEME = ED_THEME === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = ED_THEME;
  document.getElementById('ed-theme-btn').textContent = ED_THEME === 'dark' ? '☾' : '☀';
  mermaid.initialize(Object.assign({ startOnLoad: false }, MERMAID_THEMES[ED_THEME]));
  document.querySelectorAll('.mermaid').forEach(function(el) {
    var graph = el.getAttribute('data-mermaid-src');
    if (!graph) return;
    mermaid.render('mermaid-rerender-' + (++mermaidRerenderIdx), graph).then(function(r) { el.innerHTML = r.svg; }).catch(function(e) { console.warn('enhanced-doc: Mermaid 主题切换失败:', e); });
  });
  var chartBg = ED_THEME === 'dark' ? 'transparent' : '#f8f9fa';
  document.querySelectorAll('.ed-chart').forEach(function(el) {
    var inst = echarts.getInstanceByDom(el);
    if (inst) { inst.setOption({ backgroundColor: chartBg }, false); setTimeout(function() { inst.resize(); }, 100); }
  });
}
document.getElementById('ed-theme-btn').addEventListener('click', switchTheme);

function schedulePostProcess() { setTimeout(postProcess, 600); }
if (document.readyState === 'complete') { schedulePostProcess(); }
else { window.addEventListener('load', schedulePostProcess); }
})();
