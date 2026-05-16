# AGENTS.md

## 项目概述

enhanced-doc 是一个单文件的 JavaScript 渲染引擎，将 Markdown 转换为带 Mermaid 图表、ECharts、MathJax 公式和自动目录的富文档。所有 CDN 依赖在运行时自注入。

- 入口：`enhanced-doc.js`（单文件 IIFE，无构建步骤）
- 目标：现代浏览器（ES2020+）
- 测试：Vitest（单元）+ Playwright（E2E）

## 目录结构

```
enhanced-doc/
  enhanced-doc.js         # 渲染引擎（必须位于根目录）
  AGENTS.md               # 本文件
  README.md
  LICENSE
  .gitignore
  package.json            # devDependencies: vitest, @playwright/test, jsdom
  vitest.config.js        # 单元测试配置（jsdom 环境）
  playwright.config.js    # E2E 测试配置（Chromium）
  test/
    index.html            # 全功能验收页面（引用 ../enhanced-doc.js）
    unit/                 # 单元测试（Vitest + jsdom）
      setup.js            #   环境 mock（CDN 全局变量、DOM）
      escapeText.test.js
      buildLayout.test.js
      styles.test.js
      markedExtensions.test.js
      resizeAllCharts.test.js
    e2e/                  # E2E 测试（Playwright）
      rendering.spec.js   #   渲染验证
      interactions.spec.js #  交互验证
```

## 开发流程

### 测试命令

```bash
npm test            # 运行全部单元测试（vitest）
npm run test:e2e    # 运行全部 E2E 测试（playwright）
npm run test:all    # 单元 + E2E
npm run test:watch  # 单元测试监听模式
```

### 核心规则

**修改代码后必须跑通全量测试。** 提交之前，执行 `npm run test:all` 并确认全部通过。如果测试因合理原因需要调整，在同一 commit 中更新测试文件和源码。

### 新增功能时的测试要求

| 变更类型 | 测试要求 |
|----------|----------|
| 新增/修改纯函数 | 补充或更新对应的 unit test |
| 新增/修改 DOM 渲染逻辑 | 补充或更新 E2E test |
| 新增 marked 扩展正则 | 补充 `markedExtensions.test.js` |
| Bug fix | 先补一个能复现该 bug 的失败测试，再修代码 |
| 样式/CSS 调整 | 视觉变更在 `test/index.html` 中体现 |

### 本地验收

修改完成后，用浏览器打开 `test/index.html`，手动浏览各功能块确认渲染正常。

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

## 代码规范

- 使用 `const`/`let`，禁止 `var`
- 回调使用箭头函数（除非需要 `this` 绑定）
- 文件编码 UTF-8，缩进 2 空格
- 不添加不必要的注释（代码应自解释；仅在行为非直觉时注释）
- 全局搜索的标识符使用英文，面向用户的中文文案直接写中文

## 架构约束

- `enhanced-doc.js` 必须保持在根目录（使用者通过 `<script src="enhanced-doc.js">` 引用）
- 渲染引擎保持单文件，不拆模块（CDN 依赖运行时注入，无需打包）
- `window.__enhancedDoc` 命名空间仅供测试使用，禁止在生产代码中依赖
- 外部 CDN 依赖版本号硬编码在 `enhanced-doc.js` 中，升级时需同步更新测试
