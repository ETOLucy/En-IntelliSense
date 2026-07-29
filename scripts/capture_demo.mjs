import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const baseUrl = 'http://127.0.0.1:4173';
const output = join(root, 'docs', 'assets');
const vite = spawn(
  process.execPath,
  [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), 'apps/web', '--host', '127.0.0.1', '--port', '4173'],
  { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true },
);

let serverOutput = '';
vite.stdout.on('data', chunk => { serverOutput += chunk; });
vite.stderr.on('data', chunk => { serverOutput += chunk; });

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error(`Demo server did not start.\n${serverOutput}`);
}

async function waitForWorkbench(page) {
  await page.goto(baseUrl);
  await page.locator('.document-title').getByText('Project follow-up', { exact: true }).waitFor();
  await page.getByLabel('English writing editor').waitFor();
  await page.locator('.loading').waitFor({ state: 'detached' });
}

async function screenshot(page, name) {
  await page.screenshot({
    path: join(output, name),
    fullPage: false,
    animations: 'disabled',
  });
}

await mkdir(output, { recursive: true });
await waitForServer();

const browser = await chromium.launch({ channel: 'msedge' });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('locale', 'en');
    localStorage.removeItem('ai-consent');
  });
  await waitForWorkbench(page);

  await screenshot(page, 'demo-2.0-workbench.png');

  await page.getByText('The pronoun "I" is always capitalized.').click();
  await screenshot(page, 'demo-2.0-quick-fix.png');

  await page.getByRole('button', { name: 'Outline', exact: true }).click();
  await screenshot(page, 'demo-2.0-outline.png');

  const editor = page.locator('.cm-content');
  await editor.click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type(' Updated');
  await page.getByText('Saved locally', { exact: true }).waitFor();
  await page.getByTitle('Revision history').click();
  await page.getByText('Edited document', { exact: true }).waitFor();
  await screenshot(page, 'demo-2.0-history.png');

  await page.getByTitle('New document').click();
  await page.getByRole('button', { name: 'Issues 0', exact: true }).click();
  await editor.click();
  await page.keyboard.type('I hope ');
  await page.locator('.cm-inline-completion').waitFor();
  await screenshot(page, 'demo-2.0-inline-completion.png');

  await page.locator('.document-item').filter({ hasText: 'Project follow-up' }).click();
  await page.getByRole('button', { name: 'AI', exact: true }).click();
  await page.getByRole('button', { name: 'Enable AI', exact: true }).click();
  await page.getByRole('dialog').waitFor();
  await screenshot(page, 'demo-2.0-ai-consent.png');
  await context.close();

  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  await desktopContext.addInitScript(() => {
    localStorage.setItem('locale', 'en');
    window.writeMeloDesktop = {
      byok: {
        getConfig: async () => null,
        saveConfig: async input => ({
          providerId: input.providerId,
          baseUrl: input.baseUrl,
          model: input.model,
          hasApiKey: Boolean(input.apiKey),
        }),
        clearConfig: async () => undefined,
        chat: async () => ({ reply: '' }),
      },
    };
  });
  const desktopPage = await desktopContext.newPage();
  await waitForWorkbench(desktopPage);
  await desktopPage.getByRole('button', { name: 'AI', exact: true }).click();
  await desktopPage.getByText('Your AI provider', { exact: true }).waitFor();
  await screenshot(desktopPage, 'demo-2.0-byok.png');
  await desktopContext.close();

  console.log('Captured 7 WriteMelo demo screenshots in docs/assets/.');
} finally {
  await browser.close();
  vite.kill();
}
