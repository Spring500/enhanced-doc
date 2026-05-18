import { test, expect } from '@playwright/test';

test.describe('mermaid zoom display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/index.html');
    await page.waitForSelector('.mermaid svg', { timeout: 15000 });
    await page.waitForSelector('.ed-mermaid-toolbar', { timeout: 5000 });
  });

  test('every mermaid has a zoom percentage display', async ({ page }) => {
    const svgCount = await page.locator('.mermaid svg').count();
    const zoomCount = await page.locator('.ed-mermaid-zoom').count();
    expect(zoomCount, `期望 ${svgCount} 个缩放显示，实际 ${zoomCount}`).toBe(svgCount);
  });

  test('every mermaid has a reset button', async ({ page }) => {
    const svgCount = await page.locator('.mermaid svg').count();
    const btnCount = await page.locator('.ed-mermaid-reset').count();
    expect(btnCount, `期望 ${svgCount} 个重置按钮，实际 ${btnCount}`).toBe(svgCount);
  });

  test('initial zoom is approximately 100% after fit', async ({ page }) => {
    const zoom = await page.locator('.mermaid svg').first().evaluate((svg) => {
      return svg.__szInstance ? svg.__szInstance.getZoom() : -1;
    });
    expect(zoom, `初始缩放 ${zoom} 偏离 1.0`).toBeGreaterThan(0.9);
    expect(zoom).toBeLessThan(1.15);
    const display = await page.locator('.ed-mermaid-zoom').first().textContent();
    expect(display).toMatch(/^\d+%$/);
  });

  test('zoom display updates after clicking + button', async ({ page }) => {
    const display = page.locator('.ed-mermaid-zoom').first();
    const zoomIn = page.locator('.ed-mermaid-zoom-btn').nth(1); // + 按钮在 label 右边
    const before = await display.textContent();
    await zoomIn.click();
    await page.waitForTimeout(100);
    const after = await display.textContent();
    expect(after, `缩放显示未变化: ${before} → ${after}`).not.toBe(before);
    const beforeNum = parseInt(before);
    const afterNum = parseInt(after);
    expect(afterNum, `放大后 ${afterNum} <= 放大前 ${beforeNum}`).toBeGreaterThan(beforeNum);
  });

  test('reset button restores zoom to initial fit', async ({ page }) => {
    const display = page.locator('.ed-mermaid-zoom').first();
    const zoomIn = page.locator('.ed-mermaid-zoom-btn').nth(1);
    const reset = page.locator('.ed-mermaid-reset').first();
    await zoomIn.click();
    await page.waitForTimeout(100);
    await zoomIn.click();
    await page.waitForTimeout(100);
    const zoomed = parseInt(await display.textContent());
    await reset.click();
    await page.waitForTimeout(200);
    const resetZoom = parseInt(await display.textContent());
    expect(resetZoom, `重置后缩放 ${resetZoom}% 偏离 100%`).toBeGreaterThanOrEqual(90);
    expect(resetZoom).toBeLessThanOrEqual(115);
    expect(resetZoom, `重置后 ${resetZoom} >= 放大后 ${zoomed}`).toBeLessThan(zoomed);
  });
});

test.describe('mermaid reset after environment change', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/index.html');
    await page.waitForSelector('.mermaid svg', { timeout: 15000 });
    await page.waitForSelector('.ed-mermaid-toolbar', { timeout: 5000 });
  });

  test('reset after viewport resize fits to new container size', async ({ page }) => {
    const svg = page.locator('.mermaid svg').first();
    const reset = page.locator('.ed-mermaid-reset').first();
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(1000);
    await reset.click();
    await page.waitForTimeout(200);
    const zoom = await svg.evaluate((el) =>
      el.__szInstance ? el.__szInstance.getZoom() : -1
    );
    expect(zoom, `视口变更后重置缩放 ${zoom}`).toBeGreaterThan(0.85);
    expect(zoom).toBeLessThan(1.2);
  });

  test('reset after font size change fits to new container width', async ({ page }) => {
    await page.locator('#ed-fs-down').click();
    await page.waitForTimeout(500);
    const svg = page.locator('.mermaid svg').first();
    const reset = page.locator('.ed-mermaid-reset').first();
    await reset.click();
    await page.waitForTimeout(200);
    const zoom = await svg.evaluate((el) =>
      el.__szInstance ? el.__szInstance.getZoom() : -1
    );
    expect(zoom, `字号变更后重置缩放 ${zoom}`).toBeGreaterThan(0.85);
    expect(zoom).toBeLessThan(1.2);
  });
});

test.describe('mermaid drag forwarding', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/index.html');
    await page.waitForSelector('.mermaid svg', { timeout: 15000 });
    await page.waitForSelector('.ed-mermaid-toolbar', { timeout: 5000 });
  });

  // A1: 容器空白区域可拖动——模拟 mousedown→mousemove→mouseup 事件流
  test('container blank area is draggable via event simulation', async ({ page }) => {
    const svg = page.locator('.mermaid').nth(0).locator('svg');
    const container = page.locator('.mermaid').nth(0);
    // 先放大制造空间
    await svg.dispatchEvent('wheel', { deltaY: -500, ctrlKey: true });
    await page.waitForTimeout(200);
    const zoom = await svg.evaluate((el) =>
      el.__szInstance ? el.__szInstance.getZoom() : 1
    );
    const before = await svg.evaluate((el) =>
      el.__szInstance ? el.__szInstance.getPan() : null
    );
    // 用 evaluate 在容器空白区域模拟三次 dispatch: mousedown → mousemove → mouseup
    const dx = 80;
    const changed = await page.evaluate(([dx, zoom]) => {
      const svgEl = document.querySelectorAll('.mermaid svg')[0];
      const contEl = document.querySelectorAll('.mermaid')[0];
      const svgR = svgEl.getBoundingClientRect();
      const contR = contEl.getBoundingClientRect();
      const sx = svgR.right + 10;
      if (sx > contR.right) return { err: 'no blank area', svgR_right: svgR.right, contR_right: contR.right };
      const sy = contR.top + contR.height / 2;
      contEl.dispatchEvent(new MouseEvent('mousedown', { clientX: sx, clientY: sy, button: 0, bubbles: true }));
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: sx + dx, clientY: sy, bubbles: true }));
      document.dispatchEvent(new MouseEvent('mouseup', { clientX: sx + dx, clientY: sy, bubbles: true }));
      const inst = svgEl.__szInstance;
      return { after: inst ? inst.getPan() : null };
    }, [dx, zoom]);
    if (changed.err) {
      // 空白区不够宽则跳过测试（窄屏下）
      test.skip(true, changed.err);
    }
    expect(changed.after).not.toBeNull();
    // 向右拖 dx=80, pan.x 应增大
    expect(changed.after.x, `直接事件模拟后 pan 未改变`).toBeGreaterThan(before.x + 1);
  });

  // A2: 工具栏区域也可拖动
  test('toolbar area is draggable via event simulation', async ({ page }) => {
    const svg = page.locator('.mermaid').nth(0).locator('svg');
    await svg.dispatchEvent('wheel', { deltaY: -500, ctrlKey: true });
    await page.waitForTimeout(200);
    const before = await svg.evaluate((el) =>
      el.__szInstance ? el.__szInstance.getPan() : null
    );
    const dx = 80;
    const changed = await page.evaluate((dx) => {
      const svgEl = document.querySelectorAll('.mermaid svg')[0];
      const label = document.querySelector('.ed-mermaid-zoom');
      if (!label) return { err: 'no label' };
      const lr = label.getBoundingClientRect();
      const sx = lr.left + lr.width / 2;
      const sy = lr.top + lr.height / 2;
      document.querySelector('.mermaid').dispatchEvent(
        new MouseEvent('mousedown', { clientX: sx, clientY: sy, button: 0, bubbles: true }));
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: sx + dx, clientY: sy, bubbles: true }));
      document.dispatchEvent(new MouseEvent('mouseup', { clientX: sx + dx, clientY: sy, bubbles: true }));
      return { after: svgEl.__szInstance ? svgEl.__szInstance.getPan() : null };
    }, dx);
    if (changed.err) test.skip(true, changed.err);
    expect(changed.after).not.toBeNull();
    expect(changed.after.x, `工具栏事件模拟后 pan 未改变`).toBeGreaterThan(before.x + 1);
  });

  // A3: 重置按钮上不触发拖动
  test('drag starting on reset button does NOT pan', async ({ page }) => {
    const svg = page.locator('.mermaid').nth(0).locator('svg');
    const before = await svg.evaluate((el) =>
      el.__szInstance ? el.__szInstance.getPan() : null
    );
    const dx = 80;
    const changed = await page.evaluate((dx) => {
      const svgEl = document.querySelectorAll('.mermaid svg')[0];
      const btn = document.querySelector('.ed-mermaid-reset');
      if (!btn) return { err: 'no reset btn' };
      const br = btn.getBoundingClientRect();
      const sx = br.left + br.width / 2;
      const sy = br.top + br.height / 2;
      btn.dispatchEvent(new MouseEvent('mousedown', { clientX: sx, clientY: sy, button: 0, bubbles: true }));
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: sx + dx, clientY: sy, bubbles: true }));
      document.dispatchEvent(new MouseEvent('mouseup', { clientX: sx + dx, clientY: sy, bubbles: true }));
      return { after: svgEl.__szInstance ? svgEl.__szInstance.getPan() : null };
    }, dx);
    if (changed.err) test.skip(true, changed.err);
    expect(changed.after).not.toBeNull();
    expect(Math.abs(changed.after.x - before.x), '重置按钮拖动不应导致 pan').toBeLessThan(3);
  });

  // A4: 快速大位移，验证映射精度
  test('fast large drag maps mouse distance to pan accurately', async ({ page }) => {
    const svg = page.locator('.mermaid').nth(0).locator('svg');
    await svg.dispatchEvent('wheel', { deltaY: -500, ctrlKey: true });
    await page.waitForTimeout(200);
    const dx = 150;
    const result = await page.evaluate((dx) => {
      const svgEl = document.querySelectorAll('.mermaid svg')[0];
      const contEl = document.querySelectorAll('.mermaid')[0];
      const inst = svgEl.__szInstance;
      if (!inst) return { err: 'no instance' };
      const before = { pan: inst.getPan(), zoom: inst.getZoom() };
      const svgR = svgEl.getBoundingClientRect();
      const contR = contEl.getBoundingClientRect();
      const sx = svgR.right + Math.min(10, contR.right - svgR.right - 1);
      const sy = contR.top + contR.height / 2;
      contEl.dispatchEvent(new MouseEvent('mousedown', { clientX: sx, clientY: sy, button: 0, bubbles: true }));
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: sx + dx, clientY: sy, bubbles: true }));
      document.dispatchEvent(new MouseEvent('mouseup', { clientX: sx + dx, clientY: sy, bubbles: true }));
      return { before, after: { pan: inst.getPan(), zoom: inst.getZoom() } };
    }, dx);
    if (result.err) test.skip(true, result.err);
    const panDx = result.after.pan.x - result.before.pan.x;
    const expected = dx / result.before.zoom;
    expect(Math.abs(panDx - expected), `pan偏移 ${panDx.toFixed(1)} ≠ ${expected.toFixed(1)}`).toBeLessThan(8);
  });
});

test.describe('mermaid zoom buttons', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/index.html');
    await page.waitForSelector('.mermaid svg', { timeout: 15000 });
    await page.waitForSelector('.ed-mermaid-toolbar', { timeout: 5000 });
  });

  // Z6: 每个 toolbar 有 + 和 - 两个按钮
  test('each toolbar has zoom-in and zoom-out buttons', async ({ page }) => {
    const svgCount = await page.locator('.mermaid svg').count();
    const zoomBtnCount = await page.locator('.ed-mermaid-zoom-btn').count();
    expect(zoomBtnCount, `期望 ${svgCount * 2} 个缩放按钮，实际 ${zoomBtnCount}`).toBe(svgCount * 2);
  });

  // Z7: 连续点击 + 三次，缩放递增
  test('clicking + three times increases zoom each step', async ({ page }) => {
    const display = page.locator('.ed-mermaid-zoom').first();
    const zoomIn = page.locator('.ed-mermaid-zoom-btn').nth(1);
    const nums = [parseInt(await display.textContent())];
    for (let i = 0; i < 3; i++) {
      await zoomIn.click();
      await page.waitForTimeout(50);
      nums.push(parseInt(await display.textContent()));
    }
    for (let i = 1; i < nums.length; i++) {
      expect(nums[i], `第 ${i} 次放大后 ${nums[i]} <= 上一步 ${nums[i - 1]}`).toBeGreaterThan(nums[i - 1]);
    }
  });

  // Z8: 连续点击 - 三次，缩放递减
  test('clicking - three times decreases zoom each step', async ({ page }) => {
    const display = page.locator('.ed-mermaid-zoom').first();
    const zoomIn = page.locator('.ed-mermaid-zoom-btn').nth(1);
    const zoomOut = page.locator('.ed-mermaid-zoom-btn').first();
    // 先放大一点确保有缩小空间
    await zoomIn.click(); await page.waitForTimeout(50);
    const nums = [parseInt(await display.textContent())];
    for (let i = 0; i < 3; i++) {
      await zoomOut.click();
      await page.waitForTimeout(50);
      nums.push(parseInt(await display.textContent()));
    }
    for (let i = 1; i < nums.length; i++) {
      expect(nums[i], `第 ${i} 次缩小后 ${nums[i]} >= 上一步 ${nums[i - 1]}`).toBeLessThan(nums[i - 1]);
    }
  });

  // Z9: 滚轮不再缩放
  test('wheel event no longer changes zoom', async ({ page }) => {
    const display = page.locator('.ed-mermaid-zoom').first();
    const svg = page.locator('.mermaid svg').first();
    const before = await display.textContent();
    await svg.dispatchEvent('wheel', { deltaY: -500, ctrlKey: true });
    await page.waitForTimeout(200);
    const after = await display.textContent();
    expect(after, `滚轮后缩放从 ${before} 变为 ${after}`).toBe(before);
  });

  // Z10: SVG 无双形光标
  test('SVG does not have grab cursor', async ({ page }) => {
    const cursor = await page.locator('.mermaid svg').first().evaluate((el) =>
      getComputedStyle(el).cursor
    );
    expect(cursor, `SVG 光标应为默认，实际 ${cursor}`).not.toBe('grab');
  });
});
