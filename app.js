const $ = selector => document.querySelector(selector);
const editor = $('#editor');
const mirror = $('#editorMirror');
const mirrorText = $('#mirrorText');
const ghostText = $('#ghostText');
const autocompleteStatus = $('#autocompleteStatus');
const modelThinking = $('#modelThinking');
const suggestionBar = $('#suggestionBar');
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

let currentLevel = 'natural';
let completionMode = 'auto';
let activeSuggestion = '';
let activeKind = '';
let dismissedValue = '';
let saveTimer;
let completionTimer;
let completionRequest;
let phraseOffset = 0;
let modelConfigured = false;
let assistRange = null;
const chatHistory = [];
const completionCache = new Map();

function words() {
  const matches = editor.value.trim().match(/\b[\w'-]+\b/g);
  return matches ? matches.length : 0;
}

function localWordSuggestion(value) {
  return EnWriteCompletion.getWordSuggestion(value, currentLevel);
}

function showSuggestion(suggestion, kind) {
  activeSuggestion = suggestion;
  activeKind = kind;
  mirrorText.textContent = editor.value;
  ghostText.textContent = suggestion;
  $('#suggestionKind').textContent = kind.charAt(0).toUpperCase() + kind.slice(1);
  autocompleteStatus.classList.toggle('hidden', !suggestion);
  suggestionBar.classList.toggle('hidden', !suggestion);
  $('#barKind').textContent = kind || 'Suggestion';
  $('#barText').textContent = suggestion;
  modelThinking.classList.add('hidden');
}

function clearSuggestion() {
  showSuggestion('', '');
}

function remoteMode(value) {
  if (completionMode !== 'auto') return completionMode;
  if (/([A-Za-z][A-Za-z'-]{1,})$/.test(value)) return 'word';
  return /[.!?][\s\n]*$/.test(value) ? 'sentence' : 'phrase';
}

function scheduleCompletion() {
  clearTimeout(completionTimer);
  if (completionRequest) completionRequest.abort();
  const value = editor.value;
  const atEnd = editor.selectionStart === value.length && editor.selectionEnd === value.length;
  if (!atEnd || value === dismissedValue || !value.trim()) return clearSuggestion();

  if (completionMode === 'auto' || completionMode === 'word') {
    const wordSuggestion = localWordSuggestion(value);
    if (wordSuggestion) return showSuggestion(wordSuggestion, 'word');
  }

  const mode = remoteMode(value);
  const quickSuggestion = mode !== 'word' ? EnWriteCompletion.getContextSuggestion(value) : '';
  if (quickSuggestion) showSuggestion(quickSuggestion, mode);
  else clearSuggestion();
  if (!mode || !modelConfigured) return;
  const delay = mode === 'word' ? 180 : mode === 'phrase' ? 280 : 320;
  completionTimer = setTimeout(() => requestCompletion(value, mode), delay);
}

async function requestCompletion(value, mode) {
  const cacheKey = JSON.stringify([value.slice(-1200), mode, currentLevel, $('#format').value, $('#relationship').value, $('#tone').value]);
  if (completionCache.has(cacheKey)) return showSuggestion(completionCache.get(cacheKey), mode);
  completionRequest = new AbortController();
  modelThinking.classList.remove('hidden');
  try {
    const streaming = mode !== 'word';
    const response = await fetch(streaming ? '/api/complete-stream' : '/api/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: completionRequest.signal,
      body: JSON.stringify({
        text: value,
        mode,
        level: currentLevel,
        format: $('#format').value,
        audience: $('#relationship').value,
        tone: $('#tone').value
      })
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Completion request failed');
    }
    if (streaming) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let suggestion = '';
      while (true) {
        const { value: chunk, done } = await reader.read();
        if (done) break;
        suggestion += decoder.decode(chunk, { stream: true });
        const unchanged = editor.value === value && editor.selectionStart === value.length;
        if (unchanged && suggestion) showSuggestion(suggestion, mode);
      }
      if (suggestion) {
        completionCache.set(cacheKey, suggestion);
        if (completionCache.size > 80) completionCache.delete(completionCache.keys().next().value);
      }
      return;
    }
    const data = await response.json();
    $('#connectionState').className = 'connection-state online';
    $('#connectionState').innerHTML = '<i></i> Model connected';
    const unchanged = editor.value === value && editor.selectionStart === value.length;
    if (data.suggestion) {
      completionCache.set(cacheKey, data.suggestion);
      if (completionCache.size > 80) completionCache.delete(completionCache.keys().next().value);
    }
    if (unchanged && data.suggestion) showSuggestion(data.suggestion, data.kind || mode);
  } catch (error) {
    if (error.name !== 'AbortError') {
      modelThinking.classList.add('hidden');
      $('#connectionState').className = 'connection-state offline';
      $('#connectionState').innerHTML = '<i></i> Model unavailable';
    }
  }
}

async function checkModel() {
  try {
    const response = await fetch('/api/status', { cache: 'no-store' });
    const data = await response.json();
    modelConfigured = Boolean(data.configured);
    $('#connectionState').className = `connection-state ${modelConfigured ? 'online' : 'offline'}`;
    $('#connectionState').innerHTML = `<i></i> ${modelConfigured ? `${data.autocomplete_model || data.model} autocomplete` : 'Add API key for AI'}`;
    if (modelConfigured) scheduleCompletion();
  } catch {
    modelConfigured = false;
    $('#connectionState').className = 'connection-state offline';
    $('#connectionState').innerHTML = '<i></i> Start server for AI';
  }
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
    const hasSelection = editor.selectionStart !== editor.selectionEnd;
    const before = editor.value.slice(0, editor.selectionStart);
    let phrase = button.dataset.phrase.trim();
    if (!hasSelection && before.trim()) phrase = `${/[.!?]\s*$/.test(before) ? ' ' : '. '}${phrase}`;
    editor.setRangeText(`${phrase} `, editor.selectionStart, editor.selectionEnd, 'end');
    editor.focus(); updateStats(); scheduleCompletion(); saveDraft(); notify('Phrase added');
  }));
}

function currentTextRange() {
  let start = editor.selectionStart;
  let end = editor.selectionEnd;
  if (start === end) {
    const before = editor.value.slice(0, start);
    const previousBreak = Math.max(before.lastIndexOf('.'), before.lastIndexOf('!'), before.lastIndexOf('?'), before.lastIndexOf('\n'));
    const after = editor.value.slice(start);
    const nextMatch = after.search(/[.!?\n]/);
    start = previousBreak + 1;
    end = nextMatch === -1 ? editor.value.length : start + nextMatch + 1;
  }
  while (start < end && /\s/.test(editor.value[start])) start += 1;
  return { start, end, text: editor.value.slice(start, end).trim() };
}

function openAssist(title) {
  $('#assistTitle').textContent = title;
  $('#assistContent').innerHTML = '<span class="assist-loading">Thinking...</span>';
  $('#assistResult').classList.remove('hidden');
}

async function requestAssist(action) {
  const isSubject = action === 'polish_subject';
  const range = isSubject ? null : currentTextRange();
  const text = isSubject ? $('#subject').value.trim() : range.text;
  if (!text) return notify(isSubject ? 'Write a subject first' : 'Select some text or place the cursor in a sentence');
  assistRange = range;
  openAssist(isSubject ? 'Subject ideas 标题建议' : action === 'polish_text' ? 'Polished versions 正文润色' : action === 'simplify' ? 'Simpler English 简单表达' : 'Meaning and usage 翻译与解释');
  try {
    const response = await fetch('/api/assist', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, text, context: editor.value, level: currentLevel })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Writing help failed');
    if (isSubject) renderSubjectIdeas(data.suggestions || []);
    else if (action === 'polish_text') renderTextIdeas(data.suggestions || []);
    else renderExplanation(data, action === 'simplify');
  } catch (error) {
    $('#assistContent').textContent = error.message;
  }
}

function renderSubjectIdeas(suggestions) {
  const container = $('#assistContent');
  container.textContent = '';
  const list = document.createElement('div');
  list.className = 'subject-options';
  suggestions.forEach(suggestion => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'subject-option';
    const title = document.createElement('strong'); title.textContent = suggestion.text;
    const note = document.createElement('small'); note.textContent = `${suggestion.meaning || ''}${suggestion.tone ? ` · ${suggestion.tone}` : ''}`;
    button.append(title, note);
    button.addEventListener('click', () => { $('#subject').value = suggestion.text; saveDraft(); notify('Subject updated'); });
    list.appendChild(button);
  });
  if (!suggestions.length) container.textContent = 'No subject suggestions returned.';
  else container.appendChild(list);
}

function renderTextIdeas(suggestions) {
  const container = $('#assistContent');
  container.textContent = '';
  const list = document.createElement('div');
  list.className = 'subject-options text-options';
  suggestions.forEach(suggestion => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'subject-option';
    const title = document.createElement('strong'); title.textContent = suggestion.text;
    const note = document.createElement('small'); note.textContent = `${suggestion.meaning || ''}${suggestion.tone ? ` · ${suggestion.tone}` : ''}`;
    button.append(title, note);
    button.addEventListener('click', () => {
      if (!assistRange) return;
      editor.setRangeText(suggestion.text, assistRange.start, assistRange.end, 'end');
      editor.focus(); updateStats(); scheduleCompletion(); saveDraft(); notify('Text polished');
    });
    list.appendChild(button);
  });
  if (!suggestions.length) container.textContent = 'No alternatives returned.';
  else container.appendChild(list);
}

function renderExplanation(data, emphasizeSimple) {
  const container = $('#assistContent');
  container.textContent = '';
  [['中文', data.translation], ['说明', data.explanation], ['简单表达', data.simpler]].forEach(([label, value]) => {
    if (!value) return;
    const row = document.createElement('p');
    const tag = document.createElement('span'); tag.className = 'assist-label'; tag.textContent = label;
    row.append(tag, document.createTextNode(value)); container.appendChild(row);
  });
  if (data.simpler && assistRange) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'apply-simple';
    button.textContent = emphasizeSimple ? 'Use this version 使用此表达' : 'Replace with simpler English';
    button.addEventListener('click', () => {
      editor.setRangeText(data.simpler, assistRange.start, assistRange.end, 'end');
      editor.focus(); updateStats(); scheduleCompletion(); saveDraft(); notify('Text simplified');
    });
    container.appendChild(button);
  }
}

function addChatMessage(role, content, extraClass = '') {
  const message = document.createElement('div');
  message.className = `chat-message ${role} ${extraClass}`.trim();
  message.textContent = content;
  $('#chatMessages').appendChild(message);
  $('#chatMessages').scrollTop = $('#chatMessages').scrollHeight;
  return message;
}

async function sendChat(message) {
  const text = message.trim();
  if (!text) return;
  addChatMessage('user', text);
  $('#chatInput').value = '';
  const thinking = addChatMessage('assistant', '正在结合你的草稿思考...', 'thinking');
  const hasSelection = editor.selectionStart !== editor.selectionEnd;
  const selection = hasSelection ? editor.value.slice(editor.selectionStart, editor.selectionEnd) : '';
  try {
    const response = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, context: `Subject: ${$('#subject').value}\n\n${editor.value}`, selection, history: chatHistory })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Chat failed');
    thinking.remove();
    addChatMessage('assistant', data.reply);
    chatHistory.push({ role: 'user', content: text }, { role: 'assistant', content: data.reply });
    if (chatHistory.length > 8) chatHistory.splice(0, chatHistory.length - 8);
  } catch (error) {
    thinking.classList.remove('thinking');
    thinking.textContent = `暂时无法回答：${error.message}`;
  }
}

function setFormat(format, reset = true) {
  const preset = content[format];
  $('#documentType').textContent = preset.eyebrow;
  $('#finishButton').firstChild.textContent = `${preset.finish} `;
  $('#addressFields').classList.toggle('hidden', format !== 'letter');
  $('#editorWrap').classList.toggle('standalone', format !== 'letter');
  if (reset) { $('#title').value = preset.title; editor.value = preset.text; }
  phraseOffset = 0; renderPhrases(); updateStats(); scheduleCompletion(); saveDraft();
}

function acceptSuggestion() {
  if (!activeSuggestion) return;
  editor.setRangeText(activeSuggestion, editor.selectionStart, editor.selectionEnd, 'end');
  dismissedValue = ''; updateStats(); clearSuggestion(); saveDraft(); editor.focus();
  setTimeout(scheduleCompletion, 50);
}

editor.addEventListener('input', () => { dismissedValue = ''; mirrorText.textContent = editor.value; updateStats(); scheduleCompletion(); saveDraft(); });
editor.addEventListener('click', scheduleCompletion);
editor.addEventListener('scroll', () => { mirror.scrollTop = editor.scrollTop; });
editor.addEventListener('keydown', event => {
  if (event.key === 'Tab' && activeSuggestion) { event.preventDefault(); acceptSuggestion(); }
  if (event.key === 'Escape' && activeSuggestion) { dismissedValue = editor.value; clearSuggestion(); }
});

document.querySelectorAll('[data-level]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-level]').forEach(item => item.classList.remove('selected'));
  button.classList.add('selected'); currentLevel = button.dataset.level; dismissedValue = ''; scheduleCompletion();
}));

document.querySelectorAll('[data-completion]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-completion]').forEach(item => item.classList.remove('selected'));
  button.classList.add('selected'); completionMode = button.dataset.completion; dismissedValue = ''; scheduleCompletion();
}));

$('#format').addEventListener('change', event => setFormat(event.target.value));
$('#relationship').addEventListener('change', scheduleCompletion);
$('#tone').addEventListener('change', scheduleCompletion);
$('#newDraftButton').addEventListener('click', () => setFormat($('#format').value));
$('#refreshPhrases').addEventListener('click', () => { phraseOffset = (phraseOffset + 1) % 3; renderPhrases(); notify('Phrase ideas refreshed'); });
$('#improveButton').addEventListener('click', () => {
  const replacements = [['busy, but in a good way', 'full lately, in the best possible way'], ['about more than remembering words', 'far more than an exercise in remembering words']];
  const pair = replacements.find(([plain]) => editor.value.includes(plain));
  if (!pair) return notify('Keep writing and a polish suggestion will appear');
  editor.value = editor.value.replace(pair[0], pair[1]); updateStats(); scheduleCompletion(); saveDraft(); notify('Suggestion applied');
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
suggestionBar.addEventListener('click', acceptSuggestion);
$('#polishSubject').addEventListener('click', () => requestAssist('polish_subject'));
$('#polishText').addEventListener('click', () => requestAssist('polish_text'));
$('#explainText').addEventListener('click', () => requestAssist('explain'));
$('#simplifyText').addEventListener('click', () => requestAssist('simplify'));
$('#closeAssist').addEventListener('click', () => $('#assistResult').classList.add('hidden'));
document.querySelectorAll('[data-coach-tab]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-coach-tab]').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
  const chatOpen = button.dataset.coachTab === 'chat';
  $('#coachView').classList.toggle('hidden', chatOpen);
  $('#chatView').classList.toggle('hidden', !chatOpen);
  if (chatOpen) $('#chatInput').focus();
}));
$('#chatForm').addEventListener('submit', event => { event.preventDefault(); sendChat($('#chatInput').value); });
document.querySelectorAll('[data-chat-prompt]').forEach(button => button.addEventListener('click', () => sendChat(button.dataset.chatPrompt)));

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
mirrorText.textContent = editor.value;
updateStats(); renderPhrases(); scheduleCompletion(); checkModel();
