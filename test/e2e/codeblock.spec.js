import { test, expect } from '@playwright/test';

test.describe('codeblock: syntax highlighting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/index.html');
    await page.waitForSelector('pre code', { timeout: 15000 });
  });

  // A1: C++ 关键字被正确标记
  test('cpp keywords wrapped in token.keyword spans', async ({ page }) => {
    const tokens = await page.locator('code.language-cpp .token.keyword').evaluateAll((els) =>
      els.map((e) => e.textContent)
    );
    expect(tokens).toContain('for');
    expect(tokens).toContain('int');
    expect(tokens).toContain('void');
  });

  // A2: JS 字符串被正确标记
  test('js string literal wrapped in token.string span', async ({ page }) => {
    const strings = await page.locator('code.language-js .token.string').evaluateAll((els) =>
      els.map((e) => e.textContent)
    );
    // Prism 对 "Hello, " 的处理：引号和内容可能合并在一个 token 里
    const allText = strings.join('');
    expect(allText).toContain('Hello');
  });

  // A3: Python 关键字 + 注释
  test('python keywords and comment tokenized correctly', async ({ page }) => {
    const keywords = await page.locator('code.language-python .token.keyword').evaluateAll((els) =>
      els.map((e) => e.textContent)
    );
    expect(keywords).toContain('import');
    expect(keywords).toContain('def');
    expect(keywords).toContain('return');

    const comments = await page.locator('code.language-python .token.comment').evaluateAll((els) =>
      els.map((e) => e.textContent)
    );
    expect(comments.some((c) => c.includes('返回问候语'))).toBe(true);
  });

  // A4: Bash builtin + 注释
  test('bash builtin and comment tokenized correctly', async ({ page }) => {
    const builtins = await page.locator('code.language-bash .token.builtin').evaluateAll((els) =>
      els.map((e) => e.textContent)
    );
    expect(builtins).toContain('echo');

    const comments = await page.locator('code.language-bash .token.comment').evaluateAll((els) =>
      els.map((e) => e.textContent)
    );
    expect(comments.some((c) => c.includes('这是一个注释'))).toBe(true);
  });

  // B1: 无语言标记的代码块不应被高亮
  test('plain code block has no token spans', async ({ page }) => {
    // 选择没有任何 language-* class 的 code 元素
    const hasToken = await page.evaluate(() => {
      const codes = document.querySelectorAll('pre > code');
      for (const c of codes) {
        const hasLang = c.className.includes('language-');
        if (!hasLang && c.querySelector('.token')) return true;
      }
      return false;
    });
    expect(hasToken, '无语言标记的代码块不应包含 .token 元素').toBe(false);
  });
});

test.describe('codeblock: language labels', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/index.html');
    await page.waitForSelector('pre code', { timeout: 15000 });
  });

  // C1: 每个带语言的代码块应有标签
  test('language label present on each language-tagged block', async ({ page }) => {
    const labels = await page.locator('.ed-code-lang').evaluateAll((els) =>
      els.map((e) => ({ text: e.textContent.trim(), fs: getComputedStyle(e).fontSize }))
    );
    const langNames = labels.map((l) => l.text);
    expect(langNames).toContain('cpp');
    expect(langNames).toContain('js');
    expect(langNames).toContain('python');
    expect(langNames).toContain('bash');
    // 标签字号应小于等于 12px
    for (const l of labels) {
      expect(parseFloat(l.fs), `${l.text} 标签字号 ${l.fs} > 12px`).toBeLessThanOrEqual(12);
    }
  });

  // C2: 无语言标记的代码块无标签
  test('no language label on plain code block', async ({ page }) => {
    const count = await page.locator('.ed-code-lang').count();
    // 只应有 cpp + js + python + bash = 4 个标签
    expect(count, `期望 4 个标签，实际 ${count}`).toBe(4);
  });
});

test.describe('codeblock: copy button', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/index.html');
    await page.waitForSelector('pre code', { timeout: 15000 });
    // mock 剪切板 API 以便捕获复制内容
    await page.evaluate(() => {
      window.__clipboardText = null;
      navigator.clipboard.writeText = (text) => {
        window.__clipboardText = text;
        return Promise.resolve();
      };
    });
  });

  // D1–D5: 每个代码块复制内容与原代码一致
  const expectedTexts = {
    cpp: `void Sort(int data[], int n) {\n    for (int i = 0; i < n; ++i) { /* ... */ }\n}`,
    js: `function hello(name) {\n  return "Hello, " + name + "!";\n}`,
    python: `import sys\n\ndef greet(name):\n    # 返回问候语\n    return f"Hello, {name}!"\n\nif __name__ == "__main__":\n    print(greet("World"))`,
    bash: `#!/bin/bash\n# 这是一个注释\necho "Hello World"`,
    plain: '无语言标记的纯文本块',
  };

  for (const [lang, expected] of Object.entries(expectedTexts)) {
    test(`copy ${lang} codeblock content matches original`, async ({ page }) => {
      // 定位代码块中任意一个 .ed-code-copy 按钮所在的 pre
      // 先找到对应的 code 元素，再找其容器内的按钮
      const selector = lang === 'plain'
        ? '.ed-code-wrapper:has(pre code:not([class*="language-"])) .ed-code-copy'
        : `.ed-code-wrapper:has(code.language-${lang}) .ed-code-copy`;
      const btn = page.locator(selector);
      await expect(btn, `${lang} 代码块无复制按钮`).toBeVisible();
      await btn.click();
      const copied = await page.evaluate(() => window.__clipboardText);
      expect(copied, `${lang} 复制内容不匹配`).toBe(expected);
    });
  }

  // E1: 复制后视觉反馈
  test('copy button shows checkmark then reverts', async ({ page }) => {
    const btn = page.locator('.ed-code-copy').first();
    await btn.click();
    await expect(btn).toHaveText('✓');
    await page.waitForTimeout(1200);
    await expect(btn).not.toHaveText('✓');
  });

  // E2: 复制按钮始终在右侧
  test('copy button positioned at right of header', async ({ page }) => {
    const positions = await page.locator('.ed-code-copy').evaluateAll((btns) => {
      return btns.map((btn) => {
        const header = btn.closest('.ed-code-header');
        if (!header) return { error: 'no header' };
        const headerRect = header.getBoundingClientRect();
        const btnRect = btn.getBoundingClientRect();
        return {
          headerRight: Math.round(headerRect.right),
          btnRight: Math.round(btnRect.right),
          gap: Math.round(headerRect.right - btnRect.right),
        };
      });
    });
    for (const p of positions) {
      expect(p.gap, '按钮右边缘应与 header 右边缘差距 ≤ 12px').toBeLessThanOrEqual(12);
    }
  });
});
