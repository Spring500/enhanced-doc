import { test, expect } from '@playwright/test';

test.describe('codeblock: syntax highlighting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/index.html');
    await page.waitForSelector('pre code', { timeout: 15000 });
    await page.waitForSelector('code.language-js .token', { timeout: 10000 });
  });

  test('cpp keywords wrapped in token.keyword spans', async ({ page }) => {
    const tokens = await page.locator('code.language-cpp .token.keyword').evaluateAll((els) =>
      els.map((e) => e.textContent)
    );
    expect(tokens.length, 'cpp 高亮失败：code.language-cpp 内未找到 .token.keyword 元素').toBeGreaterThan(0);
    expect(tokens).toContain('for');
    expect(tokens).toContain('int');
    expect(tokens).toContain('void');
  });

  test('js string literal wrapped in token.string span', async ({ page }) => {
    const strings = await page.locator('code.language-js .token.string').evaluateAll((els) =>
      els.map((e) => e.textContent)
    );
    const allText = strings.join('');
    expect(allText, 'js 高亮失败：未找到 .token.string 元素或内容为空').not.toBe('');
    expect(allText).toContain('Hello');
  });

  test('python keywords and comment tokenized correctly', async ({ page }) => {
    const keywords = await page.locator('code.language-python .token.keyword').evaluateAll((els) =>
      els.map((e) => e.textContent)
    );
    expect(keywords.length, 'python 高亮失败：code.language-python 内未找到 .token.keyword 元素').toBeGreaterThan(0);
    expect(keywords).toContain('import');
    expect(keywords).toContain('def');
    expect(keywords).toContain('return');

    const comments = await page.locator('code.language-python .token.comment').evaluateAll((els) =>
      els.map((e) => e.textContent)
    );
    expect(comments.length, 'python 高亮失败：code.language-python 内未找到 .token.comment 元素').toBeGreaterThan(0);
    expect(comments.some((c) => c.includes('返回问候语'))).toBe(true);
  });

  test('bash builtin and comment tokenized correctly', async ({ page }) => {
    const builtins = await page.locator('code.language-bash .token.builtin').evaluateAll((els) =>
      els.map((e) => e.textContent)
    );
    expect(builtins.length, 'bash 高亮失败：code.language-bash 内未找到 .token.builtin 元素').toBeGreaterThan(0);
    expect(builtins).toContain('echo');

    const comments = await page.locator('code.language-bash .token.comment').evaluateAll((els) =>
      els.map((e) => e.textContent)
    );
    expect(comments.length, 'bash 高亮失败：code.language-bash 内未找到 .token.comment 元素').toBeGreaterThan(0);
    expect(comments.some((c) => c.includes('这是一个注释'))).toBe(true);
  });

  test('plain code block has no token spans', async ({ page }) => {
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

  test('language label present on each language-tagged block', async ({ page }) => {
    const labels = await page.locator('.ed-code-lang').evaluateAll((els) =>
      els.map((e) => ({ text: e.textContent.trim(), fs: getComputedStyle(e).fontSize }))
    );
    const langNames = labels.map((l) => l.text);
    expect(langNames).toContain('cpp');
    expect(langNames).toContain('js');
    expect(langNames).toContain('python');
    expect(langNames).toContain('bash');
    const bodyFS = await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
    for (const l of labels) {
      expect(parseFloat(l.fs), `${l.text} 标签字号 ${l.fs} ≥ 正文 ${bodyFS}`).toBeLessThan(bodyFS);
    }
  });

  test('no language label on plain code block', async ({ page }) => {
    const count = await page.locator('.ed-code-lang').count();
    expect(count, `期望 4 个标签，实际 ${count}`).toBe(4);
  });
});

test.describe('codeblock: fold toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/index.html');
    await page.waitForSelector('.ed-code-wrapper', { timeout: 15000 });
  });

  test('every code block has a fold button', async ({ page }) => {
    const wrappers = page.locator('.ed-code-wrapper');
    const count = await wrappers.count();
    const btnCount = await page.locator('.ed-code-fold').count();
    expect(btnCount, `期望 ${count} 个折叠按钮，实际 ${btnCount}`).toBe(count);
  });

  test('code blocks are initially expanded', async ({ page }) => {
    const folded = page.locator('.ed-code-folded');
    await expect(folded).toHaveCount(0);
    await expect(page.locator('.ed-code-wrapper pre').first()).toBeVisible();
  });

  test('clicking fold hides the code block', async ({ page }) => {
    const btn = page.locator('.ed-code-fold').first();
    const pre = page.locator('.ed-code-wrapper pre').first();
    await expect(pre).toBeVisible();
    await btn.click();
    await expect(pre).not.toBeVisible();
    await expect(page.locator('.ed-code-folded').first()).toHaveCount(1);
  });

  test('clicking fold again reveals the code block', async ({ page }) => {
    const btn = page.locator('.ed-code-fold').first();
    const pre = page.locator('.ed-code-wrapper pre').first();
    await btn.click();
    await expect(pre).not.toBeVisible();
    await btn.click();
    await expect(pre).toBeVisible();
    await expect(page.locator('.ed-code-folded')).toHaveCount(0);
  });

  test('fold button icon toggles between expand and collapse arrows', async ({ page }) => {
    const btn = page.locator('.ed-code-fold').first();
    await expect(btn).toContainText('▾');
    await btn.click();
    await expect(btn).toContainText('▸');
    await btn.click();
    await expect(btn).toContainText('▾');
  });
});

test.describe('codeblock: copy button', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/index.html');
    await page.waitForSelector('pre code', { timeout: 15000 });
    await page.evaluate(() => {
      window.__clipboardText = null;
      navigator.clipboard.writeText = (text) => {
        window.__clipboardText = text;
        return Promise.resolve();
      };
    });
  });

  const expectedTexts = {
    cpp: `void Sort(int data[], int n) {\n    for (int i = 0; i < n; ++i) { /* ... */ }\n}`,
    js: `function hello(name) {\n  return "Hello, " + name + "!";\n}`,
    python: `import sys\n\ndef greet(name):\n    # 返回问候语\n    return f"Hello, {name}!"\n\nif __name__ == "__main__":\n    print(greet("World"))`,
    bash: `#!/bin/bash\n# 这是一个注释\necho "Hello World"`,
    plain: '无语言标记的纯文本块',
  };

  for (const [lang, expected] of Object.entries(expectedTexts)) {
    test(`copy ${lang} codeblock content matches original`, async ({ page }) => {
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

  test('copy button shows checkmark then reverts', async ({ page }) => {
    const btn = page.locator('.ed-code-copy').first();
    await btn.click();
    await expect(btn).toHaveText('✓');
    await page.waitForTimeout(1200);
    await expect(btn).not.toHaveText('✓');
  });

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
