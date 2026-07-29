import assert from 'node:assert/strict';
import { DEFAULT_API_UPSTREAM, proxyApiRequest } from '../node-functions/_shared/proxy.js';

let capturedUrl;
let capturedOptions;
const request = new Request('https://en-intellisense.example/api/complete?mode=word', {
  method: 'POST',
  headers: {
    accept: 'application/json',
    authorization: 'Bearer browser-value',
    'content-type': 'application/json'
  },
  body: JSON.stringify({ text: 'This is imp', mode: 'word' })
});

const response = await proxyApiRequest({ request, env: {} }, async (url, options) => {
  capturedUrl = String(url);
  capturedOptions = options;
  return new Response(JSON.stringify({ suggestion: 'important because context matters', kind: 'word' }), {
    headers: { 'content-type': 'application/json', 'content-encoding': 'gzip' }
  });
});

assert.equal(capturedUrl, `${DEFAULT_API_UPSTREAM}/api/complete?mode=word`);
assert.equal(capturedOptions.method, 'POST');
assert.equal(capturedOptions.headers.get('content-type'), 'application/json');
assert.equal(capturedOptions.headers.get('authorization'), null);
assert.equal(capturedOptions.headers.get('x-en-intellisense-gateway'), 'edgeone');
assert.deepEqual(JSON.parse(Buffer.from(capturedOptions.body).toString()), { text: 'This is imp', mode: 'word' });
assert.equal(response.status, 200);
assert.equal(response.headers.get('content-type'), 'application/json');
assert.equal(response.headers.get('cache-control'), 'no-store');
assert.equal(response.headers.get('content-encoding'), null);
assert.equal(response.headers.get('x-en-intellisense-origin'), 'edgeone');
assert.deepEqual(await response.json(), { suggestion: 'ortant', kind: 'word' });

const streamResponse = await proxyApiRequest({
  request: new Request('https://en-intellisense.example/api/complete-stream', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: 'This is imp', mode: 'word' })
  }),
  env: {}
}, async () => new Response('ossible and unnecessarily long', {
  headers: { 'content-type': 'text/plain; charset=utf-8' }
}));
assert.equal(await streamResponse.text(), 'ossible');

const invalidUpstream = await proxyApiRequest({
  request: new Request('https://en-intellisense.example/api/status'),
  env: { API_UPSTREAM: 'http://insecure.example' }
});
assert.equal(invalidUpstream.status, 502);
assert.deepEqual(await invalidUpstream.json(), { error: 'AI service is temporarily unavailable' });

console.log('EdgeOne API proxy tests passed');
