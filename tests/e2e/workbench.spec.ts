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
  await page.getByText('The pronoun "I" is always capitalized.').click();
  await page.getByRole('button', { name: 'Change to "I"' }).click();
  await expect(page.getByText('The pronoun "I" is always capitalized.')).toHaveCount(0);
});

test('requires explicit consent before enabling AI', async ({ page }) => {
  let chatRequests = 0;
  await page.route('**/api/chat', async route => {
    chatRequests += 1;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ reply: 'Use a concise opening.' }) });
  });
  await page.getByRole('button', { name: 'AI', exact: true }).click();
  await expect(page.getByLabel('AI question')).toBeDisabled();
  expect(chatRequests).toBe(0);
  await page.getByRole('button', { name: '启用 AI' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: '启用 AI' }).click();
  await expect(page.getByLabel('AI question')).toBeEnabled();
  await page.getByLabel('AI question').fill('How can I improve the opening?');
  await page.getByRole('button', { name: '询问 AI' }).click();
  await expect(page.getByText('Use a concise opening.')).toBeVisible();
  expect(chatRequests).toBe(1);
});

test('mobile editor starts with the inspector closed', async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 860 });
  await page.reload();
  await expect(page.locator('.inspector-pane')).toHaveClass(/closed/);
  await page.getByTitle('问题').click();
  await expect(page.locator('.inspector-pane')).toHaveClass(/open/);
});

test('stores revisions locally and can open the history panel', async ({ page }) => {
  const editor = page.locator('.cm-content');
  await editor.click();
  await page.keyboard.type(' Updated');
  await expect(page.getByText('正在保存...')).toBeVisible();
  await expect(page.getByText('已保存到本机')).toBeVisible({ timeout: 5_000 });
  await page.getByTitle('版本历史').click();
  await expect(page.getByText('Edited document').first()).toBeVisible();
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
