# enhanced-doc

> 一行 JS 把 Markdown 变成带图、表、数学公式、导航的富文档。为 AI Agent 设计，对人类可读。

```html
<script src="https://cdn.jsdelivr.net/gh/Spring500/enhanced-doc@v2.1/enhanced-doc.js"></script>
```

## 功能

写纯 Markdown，自动渲染：

| 功能 | 用法 |
|------|------|
| Mermaid 图表 | `:::mermaid` 容器 |
| ECharts 数据图 | `:::chart` 容器（JSON 配置） |
| 数学公式 | `$...$` 行内 和 `$$...$$` 块级（MathJax） |
| 提示框 | `!!! Tip` / `!!! Warning` / `!!! Note` / `!!! Error` |
| 折叠块 | `<details><summary>` |
| 章节折叠 | 点击 h2/h3/h4 折叠内容 |
| 自动目录 | 侧边栏 + tocbot |
| 暗/亮主题 | 一键切换按钮 |
| 字号缩放 | 50%-200%，7 档 |
| 响应式 | Pico CSS，移动端适配 |
| SVG 缩放 | Mermaid 图可拖拽缩放 |

## 快速开始

模板只需两个 `<script>` 块：

```html
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
<script type="text/x-markdown">

# 文档标题

正文内容……

</script>
<script src="https://cdn.jsdelivr.net/gh/Spring500/enhanced-doc@v2.1/enhanced-doc.js"></script>
</body>
</html>
```

所有依赖（Pico CSS、marked、Mermaid、ECharts、tocbot、MathJax 等）由 enhanced-doc.js 自动从 CDN 注入，无需手动引用。标题自动从 `# 标题` 提取。

## 依赖

以下库由 enhanced-doc.js 自动加载（jsDelivr CDN），无需手动引入：

- [Pico CSS](https://picocss.com) — 主题样式
- [marked.js](https://marked.js.org) — Markdown 解析
- [marked-gfm-heading-id](https://github.com/markedjs/marked-gfm-heading-id) — 标题锚点
- [Mermaid](https://mermaid.js.org) — 图表
- [ECharts](https://echarts.apache.org) — 数据图表
- [tocbot](https://tscanlin.github.io/tocbot/) — 侧边目录
- [svg-pan-zoom](https://github.com/bumbu/svg-pan-zoom) — 图表缩放
- [MathJax](https://www.mathjax.org) — 数学公式

## License

MIT
