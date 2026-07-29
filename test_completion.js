const assert = require('node:assert/strict');
const completion = require('./completion');

assert.equal(completion.getWordSuggestion('Hi, Ayna! I would love to hel', 'natural'), 'p');
assert.equal(completion.getWordSuggestion('This is imp', 'simple'), 'ortant');
assert.equal(completion.getContextSuggestion('Hi Emma, I would love to '), "hear how you've been lately.");
assert.equal(completion.normalizeSuggestionBoundary('Last weekend, I', 'went for a walk.', 'phrase'), ' went for a walk.');
assert.equal(completion.normalizeSuggestionBoundary('Last weekend, I ', 'went for a walk.', 'phrase'), 'went for a walk.');
assert.equal(completion.normalizeSuggestionBoundary('hel', 'p', 'word'), 'p');
assert.deepEqual(completion.getSentenceRange('Hello there. How are you?', 18), { start: 13, end: 25, text: 'How are you?' });
assert.deepEqual(completion.getSentenceRange('Hello there. How are you?', 25), { start: 13, end: 25, text: 'How are you?' });
assert.deepEqual(
  completion.findIssueRanges('I very like it. I very like this.', [
    { quote: 'very like', replacement: 'really like' },
    { quote: 'very like', replacement: 'really like' }
  ]).map(({ start, end }) => ({ start, end })),
  [{ start: 2, end: 11 }, { start: 18, end: 27 }]
);
console.log('contextual completion tests passed');
