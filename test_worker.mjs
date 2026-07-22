import assert from 'node:assert/strict';
import { normalizeCompletion } from './worker.js';

assert.equal(normalizeCompletion('ossible that I should reconsider', 'This is imp', 'word'), 'ossible');
assert.equal(normalizeCompletion('important because context matters', 'This is imp', 'word'), 'ortant');
assert.equal(normalizeCompletion('a clearer next step', 'We need', 'phrase'), ' a clearer next step');

console.log('Worker normalization tests passed');
