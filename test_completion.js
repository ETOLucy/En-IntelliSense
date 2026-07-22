const assert = require('node:assert/strict');
const completion = require('./completion');

assert.equal(completion.getWordSuggestion('Hi, Ayna! I would love to hel', 'natural'), 'p');
assert.equal(completion.getWordSuggestion('This is imp', 'simple'), 'ortant');
assert.equal(completion.getContextSuggestion('Hi Emma, I would love to '), "hear how you've been lately.");
console.log('contextual completion tests passed');
