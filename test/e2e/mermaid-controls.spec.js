import { test, expect } from '@playwright/test';

test.describe('mermaid zoom display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/index.html');
    await page.waitForSelector('.mermaid svg', { timeout: 15000 });
  });

  // Z1: 每个 Mermaid 图都有缩放百分比显示
  test('every mermaid has a zoom percentage display', async ({ page }) => {
    const svgCount = await page.locator('.mermaid svg').count();
    const zoomCount = await page.locator('.ed-mermaid-zoom').count();
    expect(zoomCount, `期望 ${svgCount} 个缩放显示，实际 ${zoomCount}`).toBe(svgCount);
  });

  // Z2: 每个 Mermaid 图都有重置按钮
  test('every mermaid has a reset button', async ({ page }) => {
    const svgCount = await page.locator('.mermaid svg').count();
    const btnCount = await page.locator('.ed-mermaid-reset').count();
    expect(btnCount, `期望 ${svgCount} 个重置按钮，实际 ${btnCount}`).toBe(svgCount);
  });

  // Z3: 初始缩放应在 100% 附近（fit 结果）
  test('initial zoom is approximately 100% after fit', async ({ page }) => {
    const zoom = await page.locator('.mermaid svg').first().evaluate((svg) => {
      return svg.__szInstance ? svg.__szInstance.getZoom() : -1;
    });
    expect(zoom, `初始缩放 ${zoom} 偏离 1.0`).toBeGreaterThan(0.9);
    expect(zoom).toBeLessThan(1.15);
    // 显示应同步
    const display = await page.locator('.ed-mermaid-zoom').first().textContent();
    expect(display).toMatch(/^\d+%$/);
  });

  // Z4: 滚轮缩放后显示更新
  test('zoom display updates after wheel zoom', async ({ page }) => {
    const svg = page.locator('.mermaid svg').first();
    const display = page.locator('.ed-mermaid-zoom').first();

    const before = await display.textContent();
    // 放大（ctrl+滚轮）
    await svg.dispatchEvent('wheel', { deltaY: -120, ctrlKey: true });
    await page.waitForTimeout(200);
    const after = await display.textContent();
    expect(after, `缩放显示未变化: ${before} → ${after}`).not.toBe(before);
    // 放大后数值应更大
    const beforeNum = parseInt(before);
    const afterNum = parseInt(after);
    expect(afterNum, `放大后 ${afterNum} <= 放大前 ${beforeNum}`).toBeGreaterThan(beforeNum);
  });

  // Z5: 点击重置回到初始缩放
  test('reset button restores zoom to initial fit', async ({ page }) => {
    const svg = page.locator('.mermaid svg').first();
    const reset = page.locator('.ed-mermaid-reset').first();
    const display = page.locator('.ed-mermaid-zoom').first();

    // 先放大
    await svg.dispatchEvent('wheel', { deltaY: -240, ctrlKey: true });
    await page.waitForTimeout(200);
    const zoomed = parseInt(await display.textContent());

    // 点击重置
    await reset.click();
    await page.waitForTimeout(200);
    const resetZoom = parseInt(await display.textContent());

    // 重置后应在 100% 附近
    expect(resetZoom, `重置后缩放 ${resetZoom}% 偏离 100%`).toBeGreaterThanOrEqual(90);
    expect(resetZoom).toBeLessThanOrEqual(115);
    // 且小于放大后的值
    expect(resetZoom, `重置后 ${resetZoom} >= 放大后 ${zoomed}`).toBeLessThan(zoomed);
  });
});

test.describe('mermaid reset after environment change', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/index.html');
    await page.waitForSelector('.mermaid svg', { timeout: 15000 });
  });

  // Z6: 视口缩放后点击重置，应以新视口为基准重新 fit
  test('reset after viewport resize fits to new container size', async ({ page }) => {
    const reset = page.locator('.ed-mermaid-reset').first();

    // 先放大偏离
    const svg = page.locator('.mermaid svg').first();
    await svg.dispatchEvent('wheel', { deltaY: -240, ctrlKey: true });
    await page.waitForTimeout(200);

    // 改变视口
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(1000); // 等 resize + applyMermaidSizing 完成

    // 重置
    await reset.click();
    await page.waitForTimeout(200);
    const zoom = await svg.evaluate((el) =>
      el.__szInstance ? el.__szInstance.getZoom() : -1
    );
    // 新视口下也应 fit 到约 100%
    expect(zoom, `视口变更后重置缩放 ${zoom}`).toBeGreaterThan(0.85);
    expect(zoom).toBeLessThan(1.2);
  });

  // Z7: 字号调整后点击重置，应以新容器宽度为基准重新 fit
  test('reset after font size change fits to new container width', async ({ page }) => {
    // 先缩小字号
    await page.locator('#ed-fs-down').click();
    await page.waitForTimeout(500); // applyMermaidSizing 被 resize 触发或需要手动

    const reset = page.locator('.ed-mermaid-reset').first();
    await reset.click();
    await page.waitForTimeout(200);

    const svg = page.locator('.mermaid svg').first();
    const zoom = await svg.evaluate((el) =>
      el.__szInstance ? el.__szInstance.getZoom() : -1
    );
    expect(zoom, `字号变更后重置缩放 ${zoom}`).toBeGreaterThan(0.85);
    expect(zoom).toBeLessThan(1.2);
  });
});
