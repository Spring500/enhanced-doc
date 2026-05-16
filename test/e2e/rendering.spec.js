import { test, expect } from '@playwright/test';

test.describe('page rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/index.html');
    // 等 Mermaid 和 ECharts 渲染完毕
    await page.waitForSelector('.mermaid svg', { timeout: 15000 });
  });

  test('page title is extracted from h1', async ({ page }) => {
    await expect(page).toHaveTitle(/enhanced-doc 功能测试/);
  });

  test('no console errors on load', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.reload();
    await page.waitForSelector('.mermaid svg', { timeout: 15000 });
    expect(errors.filter((e) => !e.includes('favicon'))).toHaveLength(0);
  });

  test('body content is rendered', async ({ page }) => {
    const content = page.locator('#content');
    await expect(content).not.toBeEmpty();
  });

  test('TOC is generated with correct heading count', async ({ page }) => {
    const tocLinks = page.locator('#toc .toc-link');
    const count = await tocLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Mermaid flowchart svg exists', async ({ page }) => {
    const svgs = page.locator('.mermaid svg');
    const count = await svgs.count();
    // flowchart + sequence + state + gantt + tall + wide = 6
    expect(count).toBeGreaterThanOrEqual(6);
  });

  // Mermaid 容器和 ECharts 一样应有底色框和圆角，让用户能识别控件范围。
  // 失败意味着 .mermaid 类缺少和 .ed-chart 等效的背景样式。
  test('Mermaid container has background styling like ECharts', async ({ page }) => {
    const mermaid = page.locator('.mermaid').first();
    const styles = await mermaid.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        backgroundColor: cs.backgroundColor,
        borderRadius: cs.borderRadius,
        padding: cs.paddingTop,
      };
    });
    // .ed-chart 使用 var(--pico-card-background-color, transparent)
    // 在暗色主题下应是非透明值 (rgba(...) 格式)
    expect(styles.backgroundColor, '缺少背景色，Mermaid 容器应与 ECharts 一样有底色框')
      .not.toBe('rgba(0, 0, 0, 0)');
    expect(styles.borderRadius, '缺少圆角').not.toBe('0px');
    expect(styles.padding, '缺少内边距').not.toBe('0px');
  });

  // Mermaid 容器高度不应超出 SVG 渲染高度的 20%，否则下方留出大段空白。
  // 失败意味着 postProcessMermaidSvg 中的 minHeight 过度撑高了容器。
  test('Mermaid container does not have excessive blank space', async ({ page }) => {
    const container = page.locator('.mermaid').first();
    const svg = container.locator('svg');
    const containerHeight = await container.evaluate((el) => el.clientHeight);
    const svgRenderedHeight = await svg.evaluate((el) => el.getBoundingClientRect().height);
    // 容器不应超出 SVG 渲染高度 20%（允许 padding 等少量余量）
    expect(containerHeight, `容器高度 ${containerHeight}px 远超 SVG 渲染高度 ${svgRenderedHeight}px，下方有大段空白`)
      .toBeLessThanOrEqual(svgRenderedHeight * 1.2);
  });

  test('ECharts canvas elements exist', async ({ page }) => {
    const canvases = page.locator('.ed-chart canvas');
    const count = await canvases.count();
    // scatter + bar + pie + section chart = 4
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('all 4 admonition types are rendered', async ({ page }) => {
    await expect(page.locator('.admonition-tip')).toHaveCount(1);
    await expect(page.locator('.admonition-warning')).toHaveCount(1);
    await expect(page.locator('.admonition-note')).toHaveCount(1);
    await expect(page.locator('.admonition-error')).toHaveCount(1);
  });

  test('admonition icons in title', async ({ page }) => {
    await expect(page.locator('.admonition-tip .admonition-title')).toContainText('💡');
    await expect(page.locator('.admonition-note .admonition-title')).toContainText('📝');
  });

  test('MathJax renders inline formula as mjx-container', async ({ page }) => {
    const mjx = page.locator('mjx-container');
    const count = await mjx.count();
    expect(count).toBeGreaterThan(0);
  });

  test('block formula $$ is rendered', async ({ page }) => {
    // 块级公式渲染为独立的 mjx-container
    await expect(page.locator('mjx-container').first()).toBeVisible();
  });

  test('details/summary fold block exists', async ({ page }) => {
    await expect(page.locator('details summary')).toHaveCount(2);
  });

  test('theme is dark on initial load', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('font bar controls are present', async ({ page }) => {
    await expect(page.locator('#ed-fs-up')).toBeVisible();
    await expect(page.locator('#ed-fs-down')).toBeVisible();
    await expect(page.locator('#ed-theme-btn')).toBeVisible();
    await expect(page.locator('#ed-fs-label')).toHaveText('100%');
  });
});
