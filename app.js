const editor = document.querySelector('#editor');
const mirror = document.querySelector('#editorMirror');
const mirrorText = document.querySelector('#mirrorText');
const ghostText = document.querySelector('#ghostText');
const autocompleteStatus = document.querySelector('#autocompleteStatus');
const wordCount = document.querySelector('#wordCount');
const saveStatus = document.querySelector('#saveStatus');
const toast = document.querySelector('#toast');

const suggestions = {
  simple: [
    ' went to a small bookshop near the river with a friend.',
    ' tried a new cafe and thought you would like it.',
    ' spent the afternoon walking around the old streets.'
  ],
  natural: [
    ' visited a small bookshop near the river with a friend.',
    ' discovered a quiet cafe that instantly made me think of you.',
    ' took a long walk through the old part of the city.'
  ],
  advanced: [
    ' stumbled upon a charming bookshop tucked away beside the river.',
    ' found a quiet cafe whose atmosphere immediately reminded me of you.',
    ' wandered through the old quarter, enjoying a rare unhurried afternoon.'
  ]
};

let currentLevel = 'natural';
let saveTimer;
let activeSuggestion = '';
let dismissedValue = '';

function countWords() {
  const words = editor.value.trim().match(/\b[\w'-]+\b/g);
  wordCount.textContent = words ? words.length : 0;
}

function chooseSuggestion(value) {
  const currentSentence = value.split(/[.!?]\s+|\n\n/).pop();
  const text = currentSentence.trimStart();
  const patterns = [
    [/^Hi$/i, ' there,'],
    [/^How are$/i, ' you doing?'],
    [/^I hope$/i, ' you are doing well.'],
    [/^Thank you$/i, ' for your lovely letter.'],
    [/^It was so$/i, ' lovely to hear from you.'],
    [/^I was happy to$/i, ' hear about your news.'],
    [/^I have been$/i, ' meaning to write to you.'],
    [/^I would love to$/i, ' hear more about it.'],
    [/^Please write$/i, ' back when you have time.'],
    [/^Last weekend,? I$/i, suggestions[currentLevel][0]],
    [/^Recently,? I$/i, suggestions[currentLevel][1]],
    [/^Yesterday,? I$/i, suggestions[currentLevel][2]]
  ];

  for (const [pattern, completion] of patterns) {
    if (pattern.test(text)) return completion;
  }
  if (/\bI$/i.test(text) && text.length > 8) return suggestions[currentLevel][0];
  if (/\bwe$/i.test(text)) return ' had a wonderful time together.';
  if (/\byou$/i.test(text)) return ' have been doing lately.';
  return '';
}

function updateInlineSuggestion() {
  const atEnd = editor.selectionStart === editor.value.length && editor.selectionEnd === editor.value.length;
  activeSuggestion = atEnd && editor.value !== dismissedValue ? chooseSuggestion(editor.value) : '';
  mirrorText.textContent = editor.value;
  ghostText.textContent = activeSuggestion;
  autocompleteStatus.classList.toggle('hidden', !activeSuggestion);
}

function acceptSuggestion() {
  if (!activeSuggestion) return;
  editor.setRangeText(activeSuggestion, editor.selectionStart, editor.selectionEnd, 'end');
  activeSuggestion = '';
  countWords();
  updateInlineSuggestion();
  editor.focus();
  scheduleSave();
}

function scheduleSave() {
  saveStatus.textContent = 'Saving...';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem('letterflow-draft', editor.value);
    saveStatus.textContent = 'Draft saved';
  }, 500);
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

editor.addEventListener('input', () => {
  dismissedValue = '';
  countWords();
  updateInlineSuggestion();
  scheduleSave();
});
editor.addEventListener('click', updateInlineSuggestion);
editor.addEventListener('keyup', event => {
  if (!['Tab', 'Escape'].includes(event.key)) updateInlineSuggestion();
});
editor.addEventListener('scroll', () => { mirror.scrollTop = editor.scrollTop; });
editor.addEventListener('keydown', event => {
  if (event.key === 'Tab' && activeSuggestion) {
    event.preventDefault();
    acceptSuggestion();
  }
  if (event.key === 'Escape' && activeSuggestion) {
    dismissedValue = editor.value;
    activeSuggestion = '';
    updateInlineSuggestion();
  }
});

document.querySelectorAll('[data-level]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-level]').forEach(item => item.classList.remove('selected'));
    button.classList.add('selected');
    currentLevel = button.dataset.level;
    dismissedValue = '';
    updateInlineSuggestion();
  });
});

document.querySelectorAll('[data-phrase]').forEach(button => {
  button.addEventListener('click', () => {
    editor.setRangeText(button.dataset.phrase, editor.selectionStart, editor.selectionEnd, 'end');
    editor.focus();
    countWords();
    updateInlineSuggestion();
    scheduleSave();
    notify('Phrase added to your letter');
  });
});

document.querySelectorAll('[data-replacement]').forEach(button => {
  button.addEventListener('click', () => {
    if (button.dataset.replacement.startsWith('Life')) {
      editor.value = editor.value.replace('Life here has been busy, but in a good way.', button.dataset.replacement);
      countWords();
      updateInlineSuggestion();
      scheduleSave();
      notify('Suggestion applied');
    }
  });
});

document.querySelector('#newLetterButton').addEventListener('click', () => {
  editor.value = 'Hi';
  document.querySelector('#recipient').value = '';
  document.querySelector('#subject').value = '';
  editor.focus();
  editor.setSelectionRange(editor.value.length, editor.value.length);
  countWords();
  updateInlineSuggestion();
  scheduleSave();
});

document.querySelector('#sendButton').addEventListener('click', () => {
  const recipient = document.querySelector('#recipient').value.trim();
  if (!recipient) {
    notify('Add a recipient before sending');
    document.querySelector('#recipient').focus();
    return;
  }
  notify(`Letter to ${recipient} is ready to send`);
});

document.querySelector('#themeButton').addEventListener('click', () => document.body.classList.toggle('dark'));
document.querySelector('#closeCoach').addEventListener('click', () => document.querySelector('.coach-panel').classList.remove('open'));
document.querySelector('.workspace').addEventListener('click', event => {
  if (window.innerWidth <= 1050 && event.target === event.currentTarget) document.querySelector('.coach-panel').classList.add('open');
});
document.querySelector('#refreshPhrases').addEventListener('click', () => notify('Phrase ideas refreshed'));

const savedDraft = localStorage.getItem('letterflow-draft');
if (savedDraft) editor.value = savedDraft;
editor.setSelectionRange(editor.value.length, editor.value.length);
countWords();
updateInlineSuggestion();
