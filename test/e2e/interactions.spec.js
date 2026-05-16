import { test, expect } from '@playwright/test';

test.describe('theme toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/index.html');
    await page.waitForSelector('.mermaid svg', { timeout: 15000 });
  });

  test('switches to light theme on click', async ({ page }) => {
    const btn = page.locator('#ed-theme-btn');
    await btn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(btn).toHaveText('☀');
  });

  test('switches back to dark on second click', async ({ page }) => {
    const btn = page.locator('#ed-theme-btn');
    await btn.click(); // light
    await btn.click(); // dark
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(btn).toHaveText('☾');
  });

  test('Mermaid svg still exists after theme switch', async ({ page }) => {
    await page.locator('#ed-theme-btn').click();
    await page.waitForTimeout(500);
    const svgs = page.locator('.mermaid svg');
    await expect(svgs.first()).toBeVisible();
  });

  // 主题切换后 Mermaid 的 <svg> 必须保留相同的样式设定，否则图表位置和尺寸会异常。
  // 失败可能原因：postProcessMermaidSvg 未在主题切换 handler 中被调用。
  test('Mermaid svg retains proper styling after theme switch', async ({ page }) => {
    await page.locator('#ed-theme-btn').click();
    await page.waitForTimeout(1000);
    const svg = page.locator('.mermaid svg').first();
    const styles = await svg.evaluate((el) => ({
      width: el.style.width,
      maxWidth: el.style.maxWidth,
      overflow: el.style.overflow,
    }));
    expect(styles.width, 'svg.style.width 应为 "100%"，图表的宽度没有重新设定').toBe('100%');
    expect(styles.maxWidth, 'svg.style.maxWidth 应为 "100%"，maxWidth 未重新设定').toBe('100%');
    expect(styles.overflow, 'svg.style.overflow 应为 "visible"，Mermaid 裁切边框问题').toBe('visible');
  });

  // 主题切换后 svgPanZoom 必须重新绑定到新 <svg> 上，否则滚轮缩放失效。
  // 失败可能原因：(a) svgPanZoom 未在主题切换 handler 中重新初始化；
  //             (b) postProcessMermaidSvg 未被调用；(c) wheel 事件未触发缩放。
  test('Mermaid svg zoom works after theme switch', async ({ page }) => {
    await page.locator('#ed-theme-btn').click();
    await page.waitForTimeout(1000);
    const svg = page.locator('.mermaid svg').first();
    const transformBefore = await svg.evaluate((el) => {
      const g = el.querySelector('g');
      return g ? g.getAttribute('transform') : null;
    });
    expect(transformBefore, 'svgPanZoom 未初始化，内部 <g> 没有 transform 属性').toBeTruthy();
    await svg.dispatchEvent('wheel', { deltaY: -120, ctrlKey: true });
    await page.waitForTimeout(300);
    const transformAfter = await svg.evaluate((el) => {
      const g = el.querySelector('g');
      return g ? g.getAttribute('transform') : null;
    });
    expect(transformAfter, '滚轮事件未改变 <g> transform，svgPanZoom 可能未绑定 wheel 监听').not.toBe(transformBefore);
  });
});

test.describe('font size controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/index.html');
    await page.waitForSelector('.mermaid svg', { timeout: 15000 });
  });

  test('increases font size on A+ click', async ({ page }) => {
    const up = page.locator('#ed-fs-up');
    const label = page.locator('#ed-fs-label');
    await up.click();
    await expect(label).toHaveText('125%');
  });

  test('decreases font size on A- click', async ({ page }) => {
    const down = page.locator('#ed-fs-down');
    const label = page.locator('#ed-fs-label');
    await down.click();
    await expect(label).toHaveText('75%');
  });

  test('clamps at maximum (200%)', async ({ page }) => {
    const up = page.locator('#ed-fs-up');
    const label = page.locator('#ed-fs-label');
    for (let i = 0; i < 20; i++) await up.click();
    await expect(label).toHaveText('200%');
  });

  test('clamps at minimum (50%)', async ({ page }) => {
    const down = page.locator('#ed-fs-down');
    const label = page.locator('#ed-fs-label');
    for (let i = 0; i < 20; i++) await down.click();
    await expect(label).toHaveText('50%');
  });
});

test.describe('section collapsing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/index.html');
    await page.waitForSelector('.mermaid svg', { timeout: 15000 });
  });

  test('click h2 collapses its section', async ({ page }) => {
    // 找到 "13. 多层级章节折叠测试" 这个 h2
    const h2 = page.locator('h2', { hasText: '多层级章节折叠测试' });
    await h2.click();
    await expect(h2).toHaveClass(/ed-collapsed/);
    // 折叠后 .ed-section.ed-collapsed 有 display:none，不可见，但 DOM 中应存在
    const section = page.locator('.ed-section-l2.ed-collapsed');
    await expect(section.first()).toHaveCount(1);
  });

  test('click collapsed h2 again expands it', async ({ page }) => {
    const h2 = page.locator('h2', { hasText: '多层级章节折叠测试' });
    await h2.click(); // collapse
    await h2.click(); // expand
    await expect(h2).not.toHaveClass(/ed-collapsed/);
  });

  test('collapsing h2 hides nested h3 content', async ({ page }) => {
    const h2 = page.locator('h2', { hasText: '多层级章节折叠测试' });
    await h2.click();
    // h3 sections under this h2 should be hidden
    const sections = page.locator('.ed-section-l2.ed-collapsed .ed-section-l3');
    const count = await sections.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('TOC interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/index.html');
    await page.waitForTimeout(1000);
  });

  test('TOC contains collapsible items', async ({ page }) => {
    const collapsible = page.locator('#toc .is-collapsible');
    const count = await collapsible.count();
    expect(count).toBeGreaterThan(0);
  });

  test('clicking collapsible TOC item toggles is-collapsed', async ({ page }) => {
    const item = page.locator('#toc .is-collapsible').first();
    // 只用该 li 的直接子 .toc-link（:scope 限制为直接子级，避免嵌套子节点的干扰）
    const link = item.locator(':scope > .toc-link');
    await link.click();
    await expect(item).toHaveClass(/is-collapsed/);
    await link.click();
    await expect(item).not.toHaveClass(/is-collapsed/);
  });
});
