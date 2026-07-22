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
assert.equal(
  completion.buildEmailComposeUrl('qq', { to: 'friend@example.com', subject: 'Hello there', body: 'Hi!' }),
  'https://mail.qq.com/cgi-bin/readtemplate?check=false&t=compose&to=friend%40example.com&subject=Hello%20there&body=Hi!'
);
assert.equal(
  completion.buildEmailComposeUrl('netease', { to: 'friend@example.com', subject: 'Hello there', body: 'Hi!' }),
  'https://mail.163.com/#module=compose.ComposeModule%7C%7B%22to%22%3A%22friend%40example.com%22%2C%22subject%22%3A%22Hello%20there%22%2C%22content%22%3A%22Hi!%22%7D'
);
assert.equal(
  completion.buildEmailComposeUrl('custom', { to: 'friend@example.com', subject: 'Hello there', body: 'Hi!' }, 'https://mail.example/compose?to={to}&subject={subject}&body={body}'),
  'https://mail.example/compose?to=friend%40example.com&subject=Hello%20there&body=Hi!'
);
assert.equal(
  completion.buildCompleteEmailText({ to: 'friend@example.com', subject: 'Hello there', body: 'Hi!\nHow are you?' }),
  'To: friend@example.com\nSubject: Hello there\n\nHi!\nHow are you?'
);
console.log('contextual completion tests passed');
