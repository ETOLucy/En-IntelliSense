import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import { chromium } from 'playwright';

const fakeKey = 'test-key-write-melo-never-real';
const profile = await mkdtemp(join(tmpdir(), 'writemelo-byok-test-'));
let receivedAuthorization = '';
const execFileAsync = promisify(execFile);

const server = createServer((request, response) => {
  receivedAuthorization = request.headers.authorization ?? '';
  let body = '';
  request.setEncoding('utf8');
  request.on('data', chunk => { body += chunk; });
  request.on('end', () => {
    const parsed = JSON.parse(body);
    if (request.url !== '/v1/chat/completions' || parsed.model !== 'test-model') {
      response.writeHead(400, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: 'Unexpected request' }));
      return;
    }
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ choices: [{ message: { content: 'Local provider reply' } }] }));
  });
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});

const address = server.address();
if (!address || typeof address === 'string') throw new Error('Could not start local provider fixture.');

const debugServer = createServer();
await new Promise((resolve, reject) => {
  debugServer.once('error', reject);
  debugServer.listen(0, '127.0.0.1', resolve);
});
const debugAddress = debugServer.address();
if (!debugAddress || typeof debugAddress === 'string') throw new Error('Could not reserve a debug port.');
const debugPort = debugAddress.port;
await new Promise(resolve => debugServer.close(resolve));

let applicationPid;
let browser;
try {
  const executable = join(process.cwd(), 'release', 'win-unpacked', 'WriteMelo.exe').replaceAll("'", "''");
  const profilePath = profile.replaceAll("'", "''");
  const command = [
    'Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue',
    `$commandLine = '"${executable}" --remote-debugging-port=${debugPort} "--user-data-dir=${profilePath}"'`,
    '$result = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $commandLine }',
    'if ($result.ReturnValue -ne 0) { throw "Win32_Process.Create failed: $($result.ReturnValue)" }',
    'Write-Output $result.ProcessId',
  ].join('; ');
  const launched = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', command]);
  const pidText = launched.stdout.match(/\d+/g)?.at(-1);
  applicationPid = pidText ? Number.parseInt(pidText, 10) : undefined;
  if (!Number.isInteger(applicationPid)) {
    throw new Error(`Could not determine packaged application process ID. ${launched.stderr.trim()}`);
  }

  const endpoint = `http://127.0.0.1:${debugPort}`;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${endpoint}/json/version`);
      if (response.ok) break;
    } catch {
      if (attempt === 49) throw new Error('Packaged application did not open its local debug endpoint.');
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  browser = await chromium.connectOverCDP(endpoint);
  const page = browser.contexts().flatMap(context => context.pages())[0];
  if (!page) throw new Error('Packaged application did not create a renderer.');
  await page.getByLabel('English writing editor').waitFor();
  if (await page.locator('.cm-editor').count() !== 1) {
    throw new Error('Packaged application did not render exactly one writing editor.');
  }
  if (await page.locator('.issue').count() < 1) {
    throw new Error('Packaged application did not render local writing diagnostics.');
  }

  const result = await page.evaluate(async ({ baseUrl, apiKey }) => {
    const bridge = window.writeMeloDesktop?.byok;
    if (!bridge) throw new Error('Desktop BYOK bridge is unavailable.');
    const saved = await bridge.saveConfig({
      providerId: 'custom',
      baseUrl,
      model: 'test-model',
      apiKey,
    });
    const reply = await bridge.chat({
      message: 'Explain this sentence.',
      context: 'I write English.',
      language: 'English',
    });
    return { saved, reply, loaded: await bridge.getConfig() };
  }, {
    baseUrl: `http://127.0.0.1:${address.port}/v1`,
    apiKey: fakeKey,
  });

  if (!result.saved.hasApiKey || result.loaded?.hasApiKey !== true) throw new Error('Saved key metadata is incorrect.');
  if (result.reply.reply !== 'Local provider reply') throw new Error('Desktop provider response was not returned.');
  if (receivedAuthorization !== `Bearer ${fakeKey}`) throw new Error('Main-process provider authorization was not applied.');

  const stored = await readFile(join(profile, 'byok-config.json'), 'utf8');
  if (stored.includes(fakeKey) || !stored.includes('encryptedApiKey')) {
    throw new Error('API key was not encrypted at rest.');
  }

  await page.evaluate(async () => {
    await window.writeMeloDesktop?.byok.clearConfig();
  });
  console.log('Desktop BYOK verification passed: encrypted storage, isolated IPC, and provider request.');
} finally {
  if (browser) await browser.close();
  if (applicationPid) {
    await execFileAsync('taskkill', ['/PID', String(applicationPid), '/T', '/F']).catch(() => undefined);
  }
  await new Promise(resolve => setTimeout(resolve, 500));
  await new Promise(resolve => server.close(resolve));
  await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}
