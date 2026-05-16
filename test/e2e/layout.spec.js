import { test, expect } from '@playwright/test';

/**
 * ═══════════════════════════════════════════════════════════════
 * Mermaid 图表渲染高度规则
 * ═══════════════════════════════════════════════════════════════
 *
 * 核心原则：
 *   每个图表完整显示在一屏内，图表容器永远不出现滚动条。
 *
 * 准则：
 *   C1 — 一屏看得完：图表高度 ≤ 屏幕 70%
 *   C2 — 比例有限制：高宽比限在 0.15:1 ~ 2:1
 *   C3 — 不能太小：图表容器 ≥ 60px 高
 *   C4 — 字不能缩没：缩进一屏时宽度 ≥ 容器 20%
 *
 * 规则（对每个有 viewBox 的 SVG，按顺序）：
 *   R1. naturalH = cw / (vbW / vbH)
 *   R2. IF naturalH ≤ vpH * 0.7 → targetH = naturalH, goto END
 *   R3. targetH = vpH * 0.7，等比缩宽度
 *   R4. IF targetW ≥ cw * 0.2 → targetH 确定, goto END
 *   R5. 回退：targetH = (cw * 0.2) / (vbW / vbH)
 *        targetH = min(targetH, cw * 2)      // 比例上限
 *        targetH = max(targetH, cw * 0.15)   // 兜底
 *        goto END
 *   R6. targetH = max(targetH, max(cw * 0.15, 60))
 *
 * 容器约束：
 *   - 不设 minHeight / maxHeight
 *   - overflow 由 CSS 决定（预设为 auto，但目标是无溢出）
 *
 * 无 viewBox 的 SVG：跳过全部规则，使用原始渲染高度。
 * 窗口 resize 时：重新执行 R1–R6。
 *
 * ═══════════════════════════════════════════════════════════════
 */

// 取播放器视口，默认 1280×720
const SCREEN_W = 1280;
const SCREEN_H = 720;
const VPH_LIMIT = Math.round(SCREEN_H * 0.7); // 504
// 容器内容宽 ≈ SCREEN_W − 240(toc) − 64(content padding) − 20(mermaid padding+border) ≈ 956
const CW_EST = 956;
const CW_20PCT = Math.round(CW_EST * 0.2); // ≈191
const CW_15PCT = Math.round(CW_EST * 0.15); // ≈143

test.describe('mermaid sizing rules', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/index.html');
    await page.waitForSelector('.mermaid svg', { timeout: 15000 });
  });

  // ═══════════════════════════════════════════════════════════════
  // 全场景尺寸与滚动条检测
  // ═══════════════════════════════════════════════════════════════

  test('every container wrap SVG with no scrollbar', async ({ page }) => {
    const data = await page.locator('.mermaid').evaluateAll((els) =>
      els.map((el, i) => ({
        index: i,
        scrollable: el.scrollHeight > el.clientHeight,
        clientH: el.clientHeight,
        scrollH: el.scrollHeight,
      }))
    );
    const bad = data.filter((d) => d.scrollable);
    expect(bad, `容器有滚动条: ${JSON.stringify(bad)}`).toHaveLength(0);
  });

  test('R1–R2: natural height ≤ viewport → unconstrained (flowchart, sequence)', async ({ page }) => {
    // index 0 = 流程图, index 1 = 时序图
    const data = await page.locator('.mermaid').evaluateAll((els) => {
      return [0, 1].map((i) => {
        const svg = els[i].querySelector('svg');
        const rect = svg ? svg.getBoundingClientRect() : null;
        return { index: i, rectH: rect ? Math.round(rect.height) : 0 };
      });
    });
    for (const d of data) {
      expect(d.rectH, `svg[${d.index}] 高度 ${d.rectH} > 视口限 ${VPH_LIMIT}`)
        .toBeLessThanOrEqual(VPH_LIMIT);
    }
  });

  test('R3–R4: shrink into viewport (state diagram)', async ({ page }) => {
    // index 2 = 状态图 (statusDiagram-v2)
    const svg = page.locator('.mermaid').nth(2).locator('svg');
    const h = await svg.evaluate((el) => Math.round(el.getBoundingClientRect().height));
    const w = await svg.evaluate((el) => Math.round(el.getBoundingClientRect().width));
    // 缩小后应 ≤ VPH_LIMIT, 宽度应 ≥ CW_20PCT
    expect(h, `状态图高度 ${h} > 视口限 ${VPH_LIMIT}`).toBeLessThanOrEqual(VPH_LIMIT);
    expect(w, `状态图宽度 ${w} < 可读下限 ${CW_20PCT}`).toBeGreaterThanOrEqual(CW_20PCT);
  });

  test('R5: shrink too narrow → fallback (ultra-tall TD)', async ({ page }) => {
    // index 4 = 超高瘦图 (flowchart TD, 15 nodes)
    const svg = page.locator('.mermaid').nth(4).locator('svg');
    const h = await svg.evaluate((el) => Math.round(el.getBoundingClientRect().height));
    const w = await svg.evaluate((el) => Math.round(el.getBoundingClientRect().width));
    // 回退后宽度 ≥ CW_20PCT, 高度 ≤ CW_EST * 2
    expect(w, `超高瘦图宽度 ${w} < 可读下限 ${CW_20PCT}`).toBeGreaterThanOrEqual(CW_20PCT);
    expect(h, `超高瘦图高度 ${h} > 比例上限 ${CW_EST * 2}`).toBeLessThanOrEqual(CW_EST * 2);
    // 此图不在一屏内 — 高度 > VPH_LIMIT
    expect(h, `超高瘦图高度 ${h} ≤ 视口限 ${VPH_LIMIT}（应超出）`)
      .toBeGreaterThan(VPH_LIMIT);
  });

  test('R6: too short → lift to min (ultra-wide LR)', async ({ page }) => {
    // index 5 = 超宽矮图 (flowchart LR, 13 nodes chain)
    const svg = page.locator('.mermaid').nth(5).locator('svg');
    const h = await svg.evaluate((el) => Math.round(el.getBoundingClientRect().height));
    // 宽度 100% = 容器内容宽, 高度 ≥ CW_15PCT
    expect(h, `超宽矮图高度 ${h} < 最小高度 ${CW_15PCT}`).toBeGreaterThanOrEqual(CW_15PCT);
  });

  test('no viewBox → skip all rules (Gantt)', async ({ page }) => {
    // index 3 = 甘特图 — 无 viewBox, 不应有我们设置的 height 约束
    // 但经过 postProcessMermaidSvg 处理后应处于正常状态
    const data = await page.locator('.mermaid').nth(3).evaluate((el) => {
      const svg = el.querySelector('svg');
      return {
        scrollable: el.scrollHeight > el.clientHeight,
        svgH: svg ? Math.round(svg.getBoundingClientRect().height) : 0,
        hasMinH: !!el.style.minHeight,
        hasMaxH: !!el.style.maxHeight,
      };
    });
    expect(data.scrollable, '无 viewBox 图不应有滚动条').toBe(false);
    // 无 viewBox 时 else 分支已将 minH/maxH 清空
    expect(data.hasMinH, '无 viewBox 图不应有 minHeight').toBe(false);
    expect(data.hasMaxH, '无 viewBox 图不应有 maxHeight').toBe(false);
  });

  // ═══════════════════════════════════════════════════════════════
  // 视口缩放测试
  // ═══════════════════════════════════════════════════════════════

  test('R1–R6 re-evaluate on viewport resize', async ({ page }) => {
    // 切换到平板竖屏 768×1024
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    const tabletVpH = Math.round(1024 * 0.7); // 717
    const svg = page.locator('.mermaid').nth(2).locator('svg'); // state diagram
    const h = await svg.evaluate((el) => Math.round(el.getBoundingClientRect().height));
    expect(h, `平板竖屏状态图高度 ${h} > ${tabletVpH}`).toBeLessThanOrEqual(tabletVpH);

    // 切换到手机横屏 812×375
    await page.setViewportSize({ width: 812, height: 375 });
    await page.waitForTimeout(500);
    const phoneVpH = Math.round(375 * 0.7); // 262
    const h2 = await svg.evaluate((el) => Math.round(el.getBoundingClientRect().height));
    expect(h2, `手机横屏状态图高度 ${h2} > ${phoneVpH}`).toBeLessThanOrEqual(phoneVpH);

    // 恢复默认
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500);
  });

  // ═══════════════════════════════════════════════════════════════
  // 主题切换后规则仍有效
  // ═══════════════════════════════════════════════════════════════

  test('rules hold after theme switch', async ({ page }) => {
    await page.locator('#ed-theme-btn').click(); // light
    await page.waitForTimeout(1500);
    // 全容器检查：无滚动条
    const data = await page.locator('.mermaid').evaluateAll((els) =>
      els.map((el) => el.scrollHeight > el.clientHeight)
    );
    expect(data.filter(Boolean).length, '主题切换后出现滚动条').toBe(0);

    // 状态图仍在一屏内
    const svg = page.locator('.mermaid').nth(2).locator('svg');
    const h = await svg.evaluate((el) => Math.round(el.getBoundingClientRect().height));
    expect(h, `主题切换后状态图高度 ${h} > ${VPH_LIMIT}`).toBeLessThanOrEqual(VPH_LIMIT);
  });
});
