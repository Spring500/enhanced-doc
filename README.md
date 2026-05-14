# enhanced-doc

> One JS file that turns raw Markdown into rich technical documents — with diagrams, charts, math, and navigation. Built for AI agents, readable by humans.

```html
<!-- Drop this in your HTML -->
<script src="https://cdn.jsdelivr.net/gh/USER/enhanced-doc@v1/enhanced-doc.js"></script>
```

## What it does

Write plain Markdown in an HTML file. enhanced-doc renders it with:

| Feature | How |
|---------|-----|
| Mermaid diagrams | `:::mermaid` container |
| ECharts charts | `:::chart` container (JSON config) |
| Math formulas | `$...$` and `$$...$$` via MathJax |
| Admonitions | `!!! Tip` / `!!! Warning` / `!!! Note` / `!!! Error` |
| Collapsible sections | `<details><summary>` |
| Multi-level folding | Click h2/h3/h4 to collapse content |
| Auto TOC | Sidebar with tocbot |
| Dark/light theme | Toggle button |
| Font scaling | 50%-200%, 7 steps |
| Responsive layout | Pico CSS, mobile-friendly |
| SVG pan-zoom | On Mermaid diagrams (optional) |

## Quick start

1. Copy the [template](#) to a new `.html` file
2. Write your content in standard Markdown
3. Open in any browser

## Dependencies (CDN)

All loaded from jsDelivr, no install needed:
- [Pico CSS](https://picocss.com) — theming
- [marked.js](https://marked.js.org) — Markdown parser
- [Mermaid](https://mermaid.js.org) — diagrams
- [ECharts](https://echarts.apache.org) — charts
- [tocbot](https://tscanlin.github.io/tocbot/) — TOC sidebar
- [svg-pan-zoom](https://github.com/bumbu/svg-pan-zoom) — diagram zoom
- [MathJax](https://www.mathjax.org) — formula rendering
- [marked-gfm-heading-id](https://github.com/markedjs/marked-gfm-heading-id) — heading anchors

## License

MIT
