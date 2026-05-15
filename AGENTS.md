# AGENTS.md

## 项目概述

enhanced-doc 是一个单文件的 JavaScript 渲染引擎，将 Markdown 转换为带 Mermaid 图表、ECharts、MathJax 公式和自动目录的富文档。所有 CDN 依赖在运行时自注入。

- 入口：`enhanced-doc.js`（单文件 IIFE，无构建步骤）
- 目标：现代浏览器（ES2020+）
- 无 package.json，无打包器，无测试框架

## 目录结构

```
enhanced-doc/
  enhanced-doc.js    # 渲染引擎（必须位于根目录，供 <script> 引用）
  AGENTS.md          # 项目指南（本文件）
  README.md
  LICENSE
  test/              # 开发测试/验收页面
    index.html       # 全功能测试（相对引用 ../enhanced-doc.js）
```

## 提交规范

格式：

```
<type>(<scope>): <summary>

[Why]
<解释为什么要做这个改动，而非描述改了什么>

[Breaking]（可选）
<不兼容变更说明>
```

### 类型

| type       | 含义            |
|------------|----------------|
| `fix`      | 修复 bug 或隐患 |
| `refactor` | 重构，不改变外部行为 |
| `style`    | 代码风格/格式调整 |
| `feat`     | 新功能          |
| `docs`     | 纯文档变更       |
| `chore`    | 构建/工具/配置   |

### 范围（本项目）

`loader` / `mermaid` / `chart` / `toc` / `controls` / `layout` / `css` — 全局变更时省略。

### 规则

- **summary**：祈使句、英文小写、不加句号、≤50 字符
- **[Why] 块**：必填，解释动机（非实现细节）
- **一次提交 = 一个"为什么"**：如果一次提交需要两个无关的理由来解释，就拆成两次提交。附带的文档更新（如改 API 后更新 README）归属在代码改动那次提交里。

### 示例

```
fix(loader): add onerror handler to loadCSS

[Why]
loadCSS 没有 reject 路径，CSS 加载失败时 Promise.all 静默通过，
页面无样式且无报错，用户无法排查问题。
```

```
refactor(chart): extract resizeAllCharts helper

[Why]
echarts resize 循环在 3 处重复出现，修复一处 bug 容易忘记其他位置。
```
