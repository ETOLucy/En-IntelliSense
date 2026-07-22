const $ = selector => document.querySelector(selector);
const editor = $('#editor');
const mirror = $('#editorMirror');
const mirrorText = $('#mirrorText');
const ghostText = $('#ghostText');
const autocompleteStatus = $('#autocompleteStatus');
const wordCount = $('#wordCount');
const saveStatus = $('#saveStatus');
const toast = $('#toast');

const content = {
  letter: {
    eyebrow: 'DRAFT LETTER', title: 'A letter to an old friend', finish: 'Finish letter',
    text: 'Hi Emma,\n\nIt was so lovely to receive your last letter. I was happy to hear about your new apartment and the little garden you have started.\n\nLife here has been busy, but in a good way. Last weekend, I',
    phrases: ['I have been meaning to tell you about ', 'That reminded me of the time when ', 'I would love to hear more about ']
  },
  essay: {
    eyebrow: 'DRAFT ESSAY', title: 'The value of learning a language', finish: 'Finish essay',
    text: 'Learning a new language is about more than remembering words. It gives us a new way to understand people and the world around us. One important reason is',
    phrases: ['One clear example of this is ', 'Another point worth considering is ', 'In conclusion, I believe that ']
  },
  message: {
    eyebrow: 'DRAFT MESSAGE', title: 'Catch up with a friend', finish: 'Finish message',
    text: "Hey! It has been a while. I was just thinking about",
    phrases: ['Are you free sometime this week? ', 'It would be great to catch up. ', 'Let me know what works for you. ']
  }
};

const completions = {
  simple: {
    'Last weekend, I': ' went to a bookshop near the river with a friend.',
    'One important reason is': ' that language helps people connect with each other.',
    'I was just thinking about': ' our last trip together. How have you been?',
    'I hope': ' you are doing well.', 'Thank you': ' for your kind message.',
    'For example': ', students can practise with people from other countries.'
  },
  natural: {
    'Last weekend, I': ' discovered a quiet bookshop by the river and immediately thought of you.',
    'One important reason is': ' that every language offers a different perspective on everyday life.',
    'I was just thinking about': ' our last trip together. We should catch up soon!',
    'I hope': ' everything has been going well for you.', 'Thank you': ' for taking the time to write back.',
    'For example': ', learners can build real friendships while practising naturally.'
  },
  advanced: {
    'Last weekend, I': ' stumbled upon a charming bookshop tucked away beside the river, which instantly reminded me of you.',
    'One important reason is': ' that language shapes not only how we communicate, but also how we interpret experience.',
    'I was just thinking about': ' our last trip together; it would be wonderful to reconnect soon.',
    'I hope': ' this message finds you happy and well.', 'Thank you': ' for such a thoughtful and encouraging reply.',
    'For example': ', meaningful exchanges allow learners to absorb nuance that textbooks rarely capture.'
  }
};

let currentLevel = 'natural';
let activeSuggestion = '';
let dismissedValue = '';
let saveTimer;
let phraseOffset = 0;

function words() {
  const matches = editor.value.trim().match(/\b[\w'-]+\b/g);
  return matches ? matches.length : 0;
}

function findSuggestion(value) {
  const tail = value.slice(-180).trimStart();
  const rules = completions[currentLevel];
  const match = Object.keys(rules).find(key => tail.endsWith(key));
  if (match) return rules[match];
  if (/\bI would like to$/i.test(tail)) return ' share a few thoughts about this topic.';
  if (/\bbecause$/i.test(tail)) return ' it makes communication clearer and more personal.';
  if (/\bhowever$/i.test(tail)) return ', there is another side to consider.';
  if (/\bwe$/i.test(tail)) return ' can learn far more when we practise together.';
  return '';
}

function updateSuggestion() {
  const atEnd = editor.selectionStart === editor.value.length && editor.selectionEnd === editor.value.length;
  activeSuggestion = atEnd && editor.value !== dismissedValue ? findSuggestion(editor.value) : '';
  mirrorText.textContent = editor.value;
  ghostText.textContent = activeSuggestion;
  autocompleteStatus.classList.toggle('hidden', !activeSuggestion);
  $('#suggestionKind').textContent = activeSuggestion.length > 42 ? 'Sentence' : 'Phrase';
}

function updateStats() {
  const count = words();
  wordCount.textContent = count;
  const score = Math.min(94, 55 + count);
  $('#flowBar').style.width = `${score}%`;
  $('#flowLabel').textContent = count < 8 ? 'Start writing' : count < 25 ? 'Taking shape' : 'Good';
  $('#flowNote').textContent = count < 8 ? 'A few more words will help the coach understand your direction.' : 'Your writing feels clear and easy to follow.';
}

function saveDraft() {
  saveStatus.textContent = 'Saving...';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const draft = { format: $('#format').value, title: $('#title').value, text: editor.value, recipient: $('#recipient').value, subject: $('#subject').value };
    localStorage.setItem('enwrite-draft', JSON.stringify(draft));
    saveStatus.textContent = 'Draft saved';
  }, 450);
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

function renderPhrases() {
  const phrases = content[$('#format').value].phrases;
  $('#phraseList').innerHTML = phrases.map((phrase, index) => {
    const shifted = phrases[(index + phraseOffset) % phrases.length];
    return `<button type="button" data-phrase="${shifted.replace(/"/g, '&quot;')}">${shifted.trim()}...</button>`;
  }).join('');
  document.querySelectorAll('[data-phrase]').forEach(button => button.addEventListener('click', () => {
    editor.setRangeText(button.dataset.phrase, editor.selectionStart, editor.selectionEnd, 'end');
    editor.focus(); updateStats(); updateSuggestion(); saveDraft(); notify('Phrase added');
  }));
}

function setFormat(format, reset = true) {
  const preset = content[format];
  $('#documentType').textContent = preset.eyebrow;
  $('#finishButton').firstChild.textContent = `${preset.finish} `;
  $('#addressFields').classList.toggle('hidden', format !== 'letter');
  $('#editorWrap').classList.toggle('standalone', format !== 'letter');
  if (reset) { $('#title').value = preset.title; editor.value = preset.text; }
  phraseOffset = 0; renderPhrases(); updateStats(); updateSuggestion(); saveDraft();
}

function acceptSuggestion() {
  if (!activeSuggestion) return;
  editor.setRangeText(activeSuggestion, editor.selectionStart, editor.selectionEnd, 'end');
  dismissedValue = ''; updateStats(); updateSuggestion(); saveDraft(); editor.focus();
}

editor.addEventListener('input', () => { dismissedValue = ''; updateStats(); updateSuggestion(); saveDraft(); });
editor.addEventListener('click', updateSuggestion);
editor.addEventListener('scroll', () => { mirror.scrollTop = editor.scrollTop; });
editor.addEventListener('keydown', event => {
  if (event.key === 'Tab' && activeSuggestion) { event.preventDefault(); acceptSuggestion(); }
  if (event.key === 'Escape' && activeSuggestion) { dismissedValue = editor.value; activeSuggestion = ''; updateSuggestion(); }
});

document.querySelectorAll('[data-level]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-level]').forEach(item => item.classList.remove('selected'));
  button.classList.add('selected'); currentLevel = button.dataset.level; dismissedValue = ''; updateSuggestion();
}));

$('#format').addEventListener('change', event => setFormat(event.target.value));
$('#newDraftButton').addEventListener('click', () => setFormat($('#format').value));
$('#refreshPhrases').addEventListener('click', () => { phraseOffset = (phraseOffset + 1) % 3; renderPhrases(); notify('Phrase ideas refreshed'); });
$('#improveButton').addEventListener('click', () => {
  const replacements = [['busy, but in a good way', 'full lately, in the best possible way'], ['about more than remembering words', 'far more than an exercise in remembering words']];
  const pair = replacements.find(([plain]) => editor.value.includes(plain));
  if (!pair) return notify('Keep writing and a polish suggestion will appear');
  editor.value = editor.value.replace(pair[0], pair[1]); updateStats(); updateSuggestion(); saveDraft(); notify('Suggestion applied');
});
$('#finishButton').addEventListener('click', () => notify(`${content[$('#format').value].finish} is ready`));
$('#themeButton').addEventListener('click', () => document.body.classList.toggle('dark'));
$('#closeCoach').addEventListener('click', () => $('.coach-panel').classList.remove('open'));
document.querySelectorAll('#title, #recipient, #subject').forEach(input => input.addEventListener('input', saveDraft));

async function copyInvite() {
  const link = `${location.href.split('#')[0]}#write-together`;
  try { await navigator.clipboard.writeText(link); notify('Invite link copied'); }
  catch { notify('Invite link: ' + link); }
}
$('#shareButton').addEventListener('click', copyInvite);
$('#copyReferral').addEventListener('click', copyInvite);

const saved = localStorage.getItem('enwrite-draft');
if (saved) {
  try {
    const draft = JSON.parse(saved);
    $('#format').value = draft.format || 'letter'; setFormat($('#format').value, false);
    $('#title').value = draft.title || content[$('#format').value].title;
    editor.value = draft.text || content[$('#format').value].text;
    $('#recipient').value = draft.recipient || ''; $('#subject').value = draft.subject || '';
  } catch { setFormat('letter'); }
} else { setFormat('letter', false); }
editor.setSelectionRange(editor.value.length, editor.value.length);
updateStats(); updateSuggestion(); renderPhrases();
