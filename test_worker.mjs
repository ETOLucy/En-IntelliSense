import assert from 'node:assert/strict';
import { compareVersions, normalizeCompletion, obsoleteDesktopClient } from './worker.js';

assert.equal(normalizeCompletion('ossible that I should reconsider', 'This is imp', 'word'), 'ossible');
assert.equal(normalizeCompletion('important because context matters', 'This is imp', 'word'), 'ortant');
assert.equal(normalizeCompletion('went for a walk', 'Last weekend, I', 'word'), '');
assert.equal(normalizeCompletion('a clearer next step', 'We need', 'phrase'), ' a clearer next step');
assert.ok(compareVersions('1.1.0', '1.0.9') > 0);
assert.equal(compareVersions('1.1', '1.1.0.0'), 0);
const obsolete = obsoleteDesktopClient(
  new Request('https://service.example.com/api/chat', { headers: { 'X-Enwrite-Client': 'windows-desktop/1.0' } }),
  { MIN_WINDOWS_CLIENT_VERSION: '1.1.0' }
);
assert.equal(obsolete.status, 426);
assert.equal((await obsolete.json()).code, 'upgrade_required');

console.log('Worker normalization tests passed');
