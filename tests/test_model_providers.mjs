import assert from 'node:assert/strict';
import worker from '../worker.js';
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

const rejected = await worker.fetch(new Request('https://app.example/api/chat', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ message: 'hello', apiKey: 'must-not-reach-cloud' }),
}), {});
assert.equal(rejected.status, 400);
assert.equal((await rejected.json()).code, 'client_secret_rejected');

console.log('Model provider routing tests passed');
