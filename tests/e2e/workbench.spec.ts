import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Project follow-up', { exact: true }).first()).toBeVisible();
});

test('switches locale and creates a local document', async ({ page }) => {
  await page.getByTitle('Language').click();
  await expect(page.getByText('Documents', { exact: true })).toBeVisible();
  await page.getByTitle('New document').click();
  await expect(page.getByText('Untitled', { exact: true }).first()).toBeVisible();
  await expect(page.getByLabel('English writing editor')).toBeVisible();
});

test('applies a local correction without AI', async ({ page }) => {
  await page.getByTitle('Language').click();
  await page.getByText('The pronoun "I" is always capitalized.').click();
  await page.getByRole('button', { name: 'Change to "I"' }).click();
  await expect(page.getByText('The pronoun "I" is always capitalized.')).toHaveCount(0);
});

test('links inline diagnostics, hover explanations, quick fixes, and Problems', async ({ page }) => {
  await page.getByTitle('Language').click();
  await expect(page.locator('.cm-writing-diagnostic-error')).not.toHaveCount(0);
  await expect(page.locator('.cm-writing-diagnostic-warning')).not.toHaveCount(0);
  await expect(page.locator('.cm-lint-marker-error')).not.toHaveCount(0);

  await page.getByText('The pronoun "I" is always capitalized.').click();
  await expect.poll(() => page.locator('.cm-content').evaluate(element =>
    element.ownerDocument.getSelection()?.toString(),
  )).toBe('i');

  const inlineIssue = page.locator('.cm-writing-diagnostic-error')
    .and(page.getByText('i', { exact: true }));
  await inlineIssue.hover();
  const tooltip = page.locator('.cm-tooltip-lint');
  await expect(tooltip).toContainText('Use a capital I when referring to yourself.');
  await tooltip.getByRole('button', { name: 'Change to "I"' }).click();

  await expect(page.getByText('The pronoun "I" is always capitalized.')).toHaveCount(0);
});

test('requires explicit consent before enabling AI', async ({ page }) => {
  await page.getByTitle('Language').click();
  let chatRequests = 0;
  const payloads: Array<{ message: string; context: string; selection: string }> = [];
  await page.route('**/api/chat', async route => {
    chatRequests += 1;
    payloads.push(route.request().postDataJSON() as { message: string; context: string; selection: string });
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ reply: 'Use a concise opening.' }) });
  });
  await page.getByRole('button', { name: 'AI', exact: true }).click();
  await expect(page.getByLabel('AI question')).toBeDisabled();
  expect(chatRequests).toBe(0);
  await page.getByRole('button', { name: 'Enable AI' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('radio', { name: 'Question only Your document stays local.' }).check();
  await page.getByRole('dialog').getByRole('button', { name: 'Save AI mode' }).click();
  await expect(page.getByLabel('AI question')).toBeEnabled();
  await page.getByLabel('AI question').fill('How can I improve the opening?');
  await page.getByRole('button', { name: 'Ask AI' }).click();
  await expect(page.getByText('Use a concise opening.')).toBeVisible();
  expect(chatRequests).toBe(1);
  expect(payloads[0]).toMatchObject({
    message: 'How can I improve the opening?',
    context: '',
    selection: '',
  });

  await page.getByRole('button', { name: 'Writing settings' }).last().click();
  await page.getByRole('radio', { name: 'Question + full document Every question also sends the current document.' }).check();
  await page.getByRole('dialog').getByRole('button', { name: 'Save AI mode' }).click();
  await page.getByLabel('AI question').fill('Review the complete email.');
  await page.getByRole('button', { name: 'Ask AI' }).click();
  await expect.poll(() => chatRequests).toBe(2);
  expect(payloads[1]?.context).toContain('Dear Alex,');
});

test('renames a document and tracks local writing activity', async ({ page }) => {
  await page.getByTitle('Language').click();
  await page.getByTitle('Rename document').click();
  await page.getByRole('dialog').getByLabel('Document name').fill('Client follow-up');
  await page.getByRole('dialog').getByRole('button', { name: 'Rename' }).click();
  await expect(page.getByText('Client follow-up', { exact: true })).toHaveCount(2);

  const editor = page.locator('.cm-content');
  await editor.click();
  await page.keyboard.type(' progress');
  await expect(page.getByText('Client follow-up', { exact: true })).toHaveCount(2);
  await expect(page.getByText(/1 today · 1 day streak/)).toBeVisible();

  await page.getByTitle('Writing settings').click();
  await expect(page.getByText('49,568 built-in · 0 personal')).toBeVisible();
});

test('shows Chinese lint copy and imports a personal dictionary', async ({ page }) => {
  await expect(page.getByRole('button', { name: '信件' })).toBeVisible();
  await expect(page.getByText('代词“I”必须大写。')).toBeVisible();
  await expect(page.getByText('语法', { exact: true })).not.toHaveCount(0);

  await page.addInitScript(() => {
    const target = window as Window & { showOpenFilePicker?: () => Promise<unknown[]> };
    target.showOpenFilePicker = async () => [{
      name: 'personal.dic',
      getFile: async () => new File(['2\nproterm/S\nWriteMelo'], 'personal.dic', { type: 'text/plain' }),
    }];
  });
  await page.reload();
  await page.getByTitle('写作设置').click();
  await page.getByRole('button', { name: '导入词典' }).click();
  await expect(page.getByText(/已从 personal\.dic 导入 2 个新词/)).toBeVisible();
  await expect(page.getByText('内置 49,568 条 · 个人词 2 条')).toBeVisible();
});

test('opens and writes a supported local text file', async ({ page }) => {
  await page.addInitScript(() => {
    const target = window as Window & {
      __savedText?: string;
      showOpenFilePicker?: () => Promise<unknown[]>;
      showSaveFilePicker?: () => Promise<unknown>;
    };
    const handle = {
      name: 'local-notes.md',
      getFile: async () => new File(['# Local notes\n\nOriginal text.'], 'local-notes.md', { type: 'text/markdown' }),
      createWritable: async () => ({
        write: async (data: string) => { target.__savedText = data; },
        close: async () => undefined,
      }),
    };
    target.showOpenFilePicker = async () => [handle];
    target.showSaveFilePicker = async () => handle;
  });
  await page.reload();
  await page.getByTitle('Language').click();

  await page.getByTitle('Open text file').click();
  await expect(page.locator('.document-title')).toHaveText('local-notes.md');
  await expect(page.getByRole('button', { name: /local-notes\.md/ })).toBeVisible();
  const editor = page.locator('.cm-content');
  await expect(editor).toContainText('Original text.');

  await editor.click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type(' Updated.');
  await expect(page.getByText(/not written to file/)).toBeVisible();
  await page.getByTitle('Save file (Ctrl+S)').click();

  await expect.poll(() => page.evaluate(() =>
    (window as Window & { __savedText?: string }).__savedText,
  )).toContain('Updated.');
  await expect(page.getByText(/not written to file/)).toHaveCount(0);
});

test('mobile editor starts with the inspector closed', async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 860 });
  await page.reload();
  await expect(page.locator('.inspector-pane')).toHaveClass(/closed/);
  await page.getByTitle('问题').click();
  await expect(page.locator('.inspector-pane')).toHaveClass(/open/);
});

test('previews, restores, and undoes a local revision', async ({ page }) => {
  await page.getByTitle('Language').click();
  const editor = page.locator('.cm-content');
  await editor.click();
  await page.keyboard.type(' Updated');
  await expect(page.getByText('Saving...')).toBeVisible();
  await expect(page.getByText('Saved locally')).toBeVisible({ timeout: 5_000 });
  await page.getByTitle('Revision history').click();
  await expect(page.getByText('Initial version')).toBeVisible();

  await page.getByTitle('Preview changes').click();
  await expect(page.getByLabel('Revision changes')).toContainText('Updated');
  await expect(page.getByLabel('Revision changes')).toContainText('1 added');
  await page.getByRole('button', { name: 'Restore' }).click();
  const dialog = page.getByRole('dialog', { name: 'Restore this version?' });
  await expect(dialog).toContainText('Updated');
  await dialog.getByRole('button', { name: 'Restore' }).click();
  await expect(editor).not.toContainText('Updated');

  await page.getByRole('button', { name: 'Undo restore' }).click();
  await expect(editor).toContainText('Updated');
});

test('shows local inline continuation and supports Escape and Tab', async ({ page }) => {
  await page.getByTitle('新建文档').click();
  const editor = page.locator('.cm-content');
  await editor.click();
  await page.keyboard.type('I hope ');
  await expect(page.locator('.cm-inline-completion')).toHaveText('you have been doing well.');
  await page.keyboard.press('Escape');
  await expect(page.locator('.cm-inline-completion')).toHaveCount(0);

  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await page.keyboard.type('I hope ');
  await expect(page.locator('.cm-inline-completion')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(editor).toContainText('I hope you have been doing well.');
});
