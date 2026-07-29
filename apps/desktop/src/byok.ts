import { ipcMain, safeStorage, type IpcMainInvokeEvent } from 'electron';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type {
  ByokChatRequest, ByokChatResult, ByokConfig, ByokConfigInput, ByokProviderId,
} from '@writemelo/contracts';

interface StoredConfig {
  version: 1;
  providerId: ByokProviderId;
  baseUrl: string;
  model: string;
  encryptedApiKey?: string;
}

interface RegisterOptions {
  userDataPath: string;
  isTrustedSender: (event: IpcMainInvokeEvent) => boolean;
}

const providerIds = new Set<ByokProviderId>(['openai', 'groq', 'together', 'openrouter', 'ollama', 'custom']);

function configPath(userDataPath: string) {
  return join(userDataPath, 'byok-config.json');
}

async function readStored(path: string): Promise<StoredConfig | null> {
  try {
    const parsed = JSON.parse(await readFile(path, 'utf8')) as Partial<StoredConfig>;
    if (
      parsed.version !== 1
      || !parsed.providerId
      || !providerIds.has(parsed.providerId)
      || typeof parsed.baseUrl !== 'string'
      || typeof parsed.model !== 'string'
    ) return null;
    return parsed as StoredConfig;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return null;
    throw error;
  }
}

function publicConfig(stored: StoredConfig): ByokConfig {
  return {
    providerId: stored.providerId,
    baseUrl: stored.baseUrl,
    model: stored.model,
    hasApiKey: Boolean(stored.encryptedApiKey),
  };
}

function validateBaseUrl(value: string) {
  const url = new URL(value);
  const localHost = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && localHost)) {
    throw new Error('Remote AI endpoints must use HTTPS. HTTP is allowed only for a local model.');
  }
  if (url.username || url.password) throw new Error('Do not include credentials in the endpoint URL.');
  url.hash = '';
  url.search = '';
  return url.toString().replace(/\/+$/, '');
}

function validateInput(value: unknown): ByokConfigInput {
  if (!value || typeof value !== 'object') throw new Error('Invalid AI configuration.');
  const input = value as Partial<ByokConfigInput>;
  if (!input.providerId || !providerIds.has(input.providerId)) throw new Error('Choose a supported provider.');
  if (typeof input.baseUrl !== 'string' || input.baseUrl.length > 500) throw new Error('Enter a valid provider endpoint.');
  if (typeof input.model !== 'string' || !input.model.trim() || input.model.length > 200) throw new Error('Enter a model ID.');
  if (input.apiKey !== undefined && (typeof input.apiKey !== 'string' || input.apiKey.length > 4096)) throw new Error('Invalid API key.');
  return {
    providerId: input.providerId,
    baseUrl: validateBaseUrl(input.baseUrl.trim()),
    model: input.model.trim(),
    ...(input.apiKey === undefined ? {} : { apiKey: input.apiKey.trim() }),
  };
}

function decryptApiKey(stored: StoredConfig) {
  if (!stored.encryptedApiKey) return '';
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Windows secure storage is unavailable.');
  return safeStorage.decryptString(Buffer.from(stored.encryptedApiKey, 'base64'));
}

async function writeAtomic(path: string, value: StoredConfig) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  try {
    await rename(temporary, path);
  } catch {
    await unlink(path).catch(() => undefined);
    await rename(temporary, path);
  }
}

function validateChat(value: unknown): ByokChatRequest {
  if (!value || typeof value !== 'object') throw new Error('Invalid AI request.');
  const input = value as Partial<ByokChatRequest>;
  const message = typeof input.message === 'string' ? input.message.trim().slice(0, 2_000) : '';
  const context = typeof input.context === 'string' ? input.context.slice(-12_000) : '';
  if (!message) throw new Error('Enter a question.');
  return {
    message,
    context,
    language: input.language === 'Simplified Chinese' ? 'Simplified Chinese' : 'English',
  };
}

function assertTrusted(event: IpcMainInvokeEvent, options: RegisterOptions) {
  if (!options.isTrustedSender(event)) throw new Error('Untrusted renderer.');
}

export function registerByokHandlers(options: RegisterOptions) {
  const path = configPath(options.userDataPath);

  ipcMain.handle('byok:get-config', async event => {
    assertTrusted(event, options);
    const stored = await readStored(path);
    return stored ? publicConfig(stored) : null;
  });

  ipcMain.handle('byok:save-config', async (event, value: unknown) => {
    assertTrusted(event, options);
    const input = validateInput(value);
    const previous = await readStored(path);
    const apiKey = input.apiKey;
    const canReuseKey = previous?.providerId === input.providerId ? previous.encryptedApiKey : undefined;
    let encryptedApiKey = canReuseKey;

    if (input.providerId === 'ollama') {
      encryptedApiKey = undefined;
    } else if (apiKey) {
      if (!safeStorage.isEncryptionAvailable()) throw new Error('Windows secure storage is unavailable; the API key was not saved.');
      encryptedApiKey = safeStorage.encryptString(apiKey).toString('base64');
    } else if (!encryptedApiKey) {
      throw new Error('Enter an API key for this provider.');
    }

    const stored: StoredConfig = {
      version: 1,
      providerId: input.providerId,
      baseUrl: input.baseUrl,
      model: input.model,
      ...(encryptedApiKey ? { encryptedApiKey } : {}),
    };
    await writeAtomic(path, stored);
    return publicConfig(stored);
  });

  ipcMain.handle('byok:clear-config', async event => {
    assertTrusted(event, options);
    await unlink(path).catch(error => {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    });
  });

  ipcMain.handle('byok:chat', async (event, value: unknown): Promise<ByokChatResult> => {
    assertTrusted(event, options);
    const request = validateChat(value);
    const stored = await readStored(path);
    if (!stored) throw new Error('Configure an AI provider first.');
    const apiKey = decryptApiKey(stored);
    const response = await fetch(`${stored.baseUrl}/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(45_000),
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: stored.model,
        messages: [
          {
            role: 'system',
            content: `You are WriteMelo, an English writing tutor. Reply in concise ${request.language}. Explain rather than replacing the writer's voice.`,
          },
          {
            role: 'user',
            content: `${request.context ? `Current draft:\n${request.context}\n\n` : ''}${request.message}`,
          },
        ],
        temperature: 0.3,
      }),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Provider request failed (${response.status}): ${text.slice(0, 300)}`);
    }
    const payload = JSON.parse(text) as { choices?: Array<{ message?: { content?: unknown } }> };
    const reply = payload.choices?.[0]?.message?.content;
    if (typeof reply !== 'string' || !reply.trim()) throw new Error('The provider returned an empty response.');
    return { reply: reply.trim() };
  });
}
