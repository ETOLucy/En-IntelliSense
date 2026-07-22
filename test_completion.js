const assert = require('node:assert/strict');
const completion = require('./completion');

assert.equal(completion.getWordSuggestion('Hi, Ayna! I would love to hel', 'natural'), 'p');
assert.equal(completion.getWordSuggestion('This is imp', 'simple'), 'ortant');
assert.equal(completion.getContextSuggestion('Hi Emma, I would love to '), "hear how you've been lately.");
assert.deepEqual(completion.getSentenceRange('Hello there. How are you?', 18), { start: 13, end: 25, text: 'How are you?' });
assert.deepEqual(completion.getSentenceRange('Hello there. How are you?', 25), { start: 13, end: 25, text: 'How are you?' });
assert.deepEqual(
  completion.findIssueRanges('I very like it. I very like this.', [
    { quote: 'very like', replacement: 'really like' },
    { quote: 'very like', replacement: 'really like' }
  ]).map(({ start, end }) => ({ start, end })),
  [{ start: 2, end: 11 }, { start: 18, end: 27 }]
);
assert.equal(
  completion.buildEmailComposeUrl('gmail', { to: 'friend@example.com', subject: 'Hello there', body: 'Hi!\nHow are you?' }),
  'https://mail.google.com/mail/?view=cm&fs=1&to=friend%40example.com&su=Hello%20there&body=Hi!%0AHow%20are%20you%3F'
);
assert.equal(
  completion.buildEmailComposeUrl('default', { to: 'friend@example.com', subject: 'Hello', body: 'Hi' }),
  'mailto:friend%40example.com?subject=Hello&body=Hi'
);
console.log('contextual completion tests passed');
