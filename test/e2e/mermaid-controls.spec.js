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

  // Z3: 初始缩放应在目标缩放附近（宽屏下 < 1.0）
  test('initial zoom is the R0 target zoom (below 1 on wide screen)', async ({ page }) => {
    const svg = page.locator('.mermaid svg').first();
    const zoom = await svg.evaluate((el) =>
      el.__szInstance ? el.__szInstance.getZoom() : -1
    );
    const target = await svg.evaluate((el) =>
      parseFloat(el.getAttribute('data-mermaid-targetzoom'))
    );
    expect(zoom, `实例缩放 ${zoom} ≠ 目标 ${target}`).toBeCloseTo(target, 1);
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

  // Z5: 点击重置回到 R0 目标缩放
  test('reset button restores zoom to R0 target', async ({ page }) => {
    const svg = page.locator('.mermaid svg').first();
    const reset = page.locator('.ed-mermaid-reset').first();

    const target = await svg.evaluate((el) =>
      parseFloat(el.getAttribute('data-mermaid-targetzoom'))
    );

    // 先放大
    await svg.dispatchEvent('wheel', { deltaY: -240, ctrlKey: true });
    await page.waitForTimeout(200);

    await reset.click();
    await page.waitForTimeout(200);
    const zoom = await svg.evaluate((el) =>
      el.__szInstance ? el.__szInstance.getZoom() : -1
    );
    expect(zoom, `重置后缩放 ${zoom} ≠ 目标 ${target}`).toBeCloseTo(target, 1);
  });
});

test.describe('mermaid reset after environment change', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/index.html');
    await page.waitForSelector('.mermaid svg', { timeout: 15000 });
  });

  // Z6: 视口缩放后点击重置，应以新目标缩放为准
  test('reset after viewport resize fits to new target zoom', async ({ page }) => {
    const svg = page.locator('.mermaid svg').first();
    const reset = page.locator('.ed-mermaid-reset').first();

    // 改变视口
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(1000);

    await reset.click();
    await page.waitForTimeout(200);
    const zoom = await svg.evaluate((el) =>
      el.__szInstance ? el.__szInstance.getZoom() : -1
    );
    const target = await svg.evaluate((el) =>
      parseFloat(el.getAttribute('data-mermaid-targetzoom'))
    );
    expect(zoom, `视口变更后重置缩放 ${zoom} ≠ 目标 ${target}`).toBeCloseTo(target, 1);
  });

  // Z7: 字号调整后点击重置，应以新目标缩放为准
  test('reset after font size change fits to new target zoom', async ({ page }) => {
    await page.locator('#ed-fs-down').click();
    await page.waitForTimeout(500);

    const svg = page.locator('.mermaid svg').first();
    const reset = page.locator('.ed-mermaid-reset').first();
    await reset.click();
    await page.waitForTimeout(200);

    const zoom = await svg.evaluate((el) =>
      el.__szInstance ? el.__szInstance.getZoom() : -1
    );
    const target = await svg.evaluate((el) =>
      parseFloat(el.getAttribute('data-mermaid-targetzoom'))
    );
    expect(zoom, `字号变更后重置缩放 ${zoom} ≠ 目标 ${target}`).toBeCloseTo(target, 1);
  });
});
