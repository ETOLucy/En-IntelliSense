import assert from 'node:assert/strict';
import worker, { chatText } from '../worker.js';
import {
  publicModelProviders,
  publicProviderCatalog,
  resolveModelEnvironment,
} from '../src/cloud/model-providers.js';

function settingsDb(activeProvider) {
  return {
    prepare(query) {
      assert.match(query, /platform_settings/);
      return {
        async first() {
          return { value: activeProvider };
        },
      };
    },
  };
}

const env = {
  DB: settingsDb('backup_a'),
  OPENAI_API_KEY: 'primary-secret',
  OPENAI_BASE_URL: 'https://primary.example.net/v1',
  OPENAI_MODEL: 'primary-model',
  MODEL_PROVIDER: 'deepseek',
  PROVIDER_BACKUP_A_API_KEY: 'backup-secret',
  PROVIDER_BACKUP_A_BASE_URL: 'https://backup.example.net/v1',
  PROVIDER_BACKUP_A_MODEL: 'backup-model',
  PROVIDER_BACKUP_A_ID: 'zhipu_bigmodel',
};

const publicProviders = publicModelProviders(env);
assert.equal(publicProviders.length, 3);
assert.equal(JSON.stringify(publicProviders).includes('primary-secret'), false);
assert.equal(JSON.stringify(publicProviders).includes('backup-secret'), false);
assert.equal(publicProviders.find(item => item.id === 'backup_a').endpoint_host, 'backup.example.net');
assert.equal(publicProviders.find(item => item.id === 'backup_a').provider_id, 'zhipu_bigmodel');
assert.equal(publicProviderCatalog().some(item => item.id === 'openai' && !item.hosted_allowed), true);

const resolved = await resolveModelEnvironment(env);
assert.equal(resolved.OPENAI_API_KEY, 'backup-secret');
assert.equal(resolved.OPENAI_BASE_URL, 'https://backup.example.net/v1');
assert.equal(resolved.OPENAI_MODEL, 'backup-model');
assert.equal(resolved.MODEL_API_STYLE, 'chat');
assert.equal(resolved.MODEL_PROVIDER_CHAIN.length, 2);

const cnResolved = await resolveModelEnvironment({
  ...env,
  MARKET: 'cn',
  DB: settingsDb('primary'),
});
assert.equal(cnResolved.ACTIVE_MODEL_PROVIDER, 'primary');
assert.deepEqual(cnResolved.MODEL_PROVIDER_CHAIN.map(item => item.ACTIVE_MODEL_PROVIDER), ['primary', 'backup_a']);

const intlResolved = await resolveModelEnvironment({
  ...env,
  MARKET: 'intl',
  DB: settingsDb('backup_a'),
  MODEL_PROVIDER: 'openai',
});
assert.equal(intlResolved.ACTIVE_MODEL_PROVIDER, 'primary');
assert.deepEqual(intlResolved.MODEL_PROVIDER_CHAIN.map(item => item.ACTIVE_MODEL_PROVIDER), ['primary']);

const originalFetch = globalThis.fetch;
const calls = [];
globalThis.fetch = async (url, options) => {
  calls.push({ url: String(url), authorization: options.headers.authorization });
  if (String(url).includes('backup.example.net')) {
    return new Response(JSON.stringify({ error: 'insufficient quota' }), { status: 403 });
  }
  return Response.json({ choices: [{ message: { content: 'fallback worked' } }] });
};
try {
  assert.equal(await chatText(resolved, 'system', 'hello'), 'fallback worked');
  assert.deepEqual(calls.map(call => new URL(call.url).hostname), ['backup.example.net', 'primary.example.net']);
  assert.deepEqual(calls.map(call => call.authorization), ['Bearer backup-secret', 'Bearer primary-secret']);

  calls.length = 0;
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), authorization: options.headers.authorization });
    return new Response(JSON.stringify({ error: 'invalid request parameter' }), { status: 400 });
  };
  await assert.rejects(() => chatText(resolved, 'system', 'hello'), /Model API returned 400/);
  assert.equal(calls.length, 1);
} finally {
  globalThis.fetch = originalFetch;
}

const rejected = await worker.fetch(new Request('https://app.example/api/chat', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ message: 'hello', apiKey: 'must-not-reach-cloud' }),
}), {});
assert.equal(rejected.status, 400);
assert.equal((await rejected.json()).code, 'client_secret_rejected');

console.log('Model provider routing tests passed');
