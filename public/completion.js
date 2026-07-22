(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.EnWriteCompletion = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  const commonWords = [
    'help', 'hear', 'hello', 'hope', 'have', 'happy', 'happen', 'know', 'like', 'love', 'look', 'learn', 'let',
    'tell', 'think', 'thank', 'take', 'talk', 'try', 'write', 'want', 'wonder', 'work', 'would', 'see', 'say', 'share',
    'feel', 'find', 'friend', 'give', 'going', 'good', 'great', 'make', 'meet', 'mean', 'need', 'people', 'really',
    'remember', 'recently', 'something', 'together', 'understand', 'very', 'well', 'because', 'before', 'after', 'about',
    'important', 'interesting', 'different', 'example', 'helpful', 'language', 'wonderful', 'world'
  ];
  const levelWords = {
    simple: ['school', 'enjoy', 'better', 'always', 'again', 'also'],
    natural: ['appreciate', 'atmosphere', 'beautiful', 'certainly', 'consider', 'delighted', 'especially', 'experience', 'familiar', 'fortunately', 'genuine', 'immediately', 'meaningful', 'naturally', 'opportunity', 'perspective', 'probably', 'recommend', 'surprisingly', 'thoughtful'],
    advanced: ['acknowledge', 'admittedly', 'compelling', 'consequently', 'considerable', 'distinctive', 'eloquently', 'fundamentally', 'furthermore', 'inevitably', 'insightful', 'nevertheless', 'profoundly', 'remarkably', 'significant', 'subsequently', 'ultimately']
  };
  const contextVerbs = [
    { pattern: /(?:would love to|want to|can you|could you)\s+\w*$/i, words: ['hear', 'help', 'know', 'see', 'tell', 'learn', 'share', 'meet', 'talk'] },
    { pattern: /(?:i|we)\s+\w*$/i, words: ['hope', 'have', 'think', 'would', 'want', 'feel', 'remember'] },
    { pattern: /(?:very|really)\s+\w*$/i, words: ['happy', 'helpful', 'good', 'important', 'interesting'] }
  ];
  const phraseRules = [
    [/I would love to\s*$/i, "hear how you've been lately."],
    [/I hope\s*$/i, 'you have been doing well.'],
    [/Thank you for\s*$/i, 'taking the time to write back.'],
    [/Last weekend, I\s*$/i, 'went for a walk and thought of you.'],
    [/One important reason is\s*$/i, 'that it helps people understand each other.'],
    [/I have been meaning to\s*$/i, 'write to you for a while.'],
    [/How have you been\??\s*$/i, ' I would love to hear what is new with you.']
  ];

  function rankedCandidates(value, level) {
    const contextual = contextVerbs.find(rule => rule.pattern.test(value));
    return [...(contextual ? contextual.words : []), ...commonWords, ...(levelWords[level] || levelWords.natural)]
      .filter((word, index, list) => list.indexOf(word) === index);
  }

  function getWordSuggestion(value, level = 'natural') {
    const match = value.match(/([A-Za-z][A-Za-z'-]{1,})$/);
    if (!match) return '';
    const typed = match[1].toLowerCase();
    const word = rankedCandidates(value, level).find(candidate => candidate.startsWith(typed) && candidate !== typed);
    return word ? word.slice(typed.length) : '';
  }

  function getContextSuggestion(value) {
    const rule = phraseRules.find(([pattern]) => pattern.test(value));
    return rule ? rule[1] : '';
  }

  function getSentenceRange(value, cursorStart, cursorEnd = cursorStart) {
    if (cursorStart !== cursorEnd) return { start: cursorStart, end: cursorEnd, text: value.slice(cursorStart, cursorEnd) };
    let anchor = cursorStart;
    let previousCharacter = anchor - 1;
    while (previousCharacter >= 0 && /\s/.test(value[previousCharacter])) previousCharacter -= 1;
    if (previousCharacter >= 0 && /[.!?]/.test(value[previousCharacter])) anchor = previousCharacter;
    const before = value.slice(0, anchor);
    const previousBreak = Math.max(before.lastIndexOf('.'), before.lastIndexOf('!'), before.lastIndexOf('?'), before.lastIndexOf('\n'));
    const after = value.slice(anchor);
    const nextMatch = after.search(/[.!?\n]/);
    let start = previousBreak + 1;
    let end = nextMatch === -1 ? value.length : anchor + nextMatch + 1;
    while (start < end && /\s/.test(value[start])) start += 1;
    return { start, end, text: value.slice(start, end).trim() };
  }

  function findIssueRanges(value, issues) {
    const claimed = [];
    return (issues || []).map(issue => {
      const quote = String(issue.quote || '');
      if (!quote) return null;
      let start = value.indexOf(quote);
      while (start !== -1 && claimed.some(range => start < range.end && start + quote.length > range.start)) {
        start = value.indexOf(quote, start + 1);
      }
      if (start === -1) return null;
      const range = { ...issue, start, end: start + quote.length };
      claimed.push(range);
      return range;
    }).filter(Boolean).sort((a, b) => a.start - b.start);
  }

  return { getWordSuggestion, getContextSuggestion, getSentenceRange, findIssueRanges };
});
