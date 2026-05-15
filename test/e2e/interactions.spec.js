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
