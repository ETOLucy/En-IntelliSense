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
const FINISHED_KEY = 'enwrite-finished';

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
let reviewIssues = [];
let currentIntent = '';
let reviewTimer;
let reviewRequest;

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
  renderMirror();
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
        tone: $('#tone').value,
        intent: currentIntent
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
    if (modelConfigured) { scheduleCompletion(); scheduleReview(); }
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

function renderMirror() {
  mirrorText.textContent = '';
  if (!reviewIssues.length) {
    mirrorText.textContent = editor.value;
    return;
  }
  let cursor = 0;
  reviewIssues.forEach((issue, index) => {
    mirrorText.appendChild(document.createTextNode(editor.value.slice(cursor, issue.start)));
    const mark = document.createElement('span');
    mark.className = `review-mark ${issue.severity === 'warning' ? 'warning' : 'suggestion'}`;
    mark.dataset.issueIndex = index;
    mark.textContent = editor.value.slice(issue.start, issue.end);
    mirrorText.appendChild(mark);
    cursor = issue.end;
  });
  mirrorText.appendChild(document.createTextNode(editor.value.slice(cursor)));
}

function scheduleReview() {
  clearTimeout(reviewTimer);
  if (!modelConfigured || words() < 4) return;
  reviewTimer = setTimeout(() => reviewDraft(false), 1600);
}

async function reviewDraft(manual = true) {
  clearTimeout(reviewTimer);
  if (reviewRequest) reviewRequest.abort();
  if (!editor.value.trim()) return;
  reviewRequest = new AbortController();
  $('#reviewDraft').disabled = true;
  $('#reviewStatus').textContent = 'Reviewing context and wording...';
  try {
    const response = await fetch('/api/review', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: reviewRequest.signal,
      body: JSON.stringify({ text: editor.value, level: currentLevel, format: $('#format').value, audience: $('#relationship').value, tone: $('#tone').value })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Review failed');
    currentIntent = data.intent || '';
    reviewIssues = EnWriteCompletion.findIssueRanges(editor.value, data.issues || []);
    renderMirror(); renderReview();
    $('#reviewStatus').textContent = reviewIssues.length ? `${reviewIssues.length} possible improvement${reviewIssues.length === 1 ? '' : 's'} found.` : 'No clear problems found.';
    if (manual && !reviewIssues.length) notify('No clear writing problems found');
  } catch (error) {
    if (error.name !== 'AbortError') $('#reviewStatus').textContent = friendlyModelError(error.message);
  } finally {
    $('#reviewDraft').disabled = false;
  }
}

function renderReview() {
  $('#reviewCount').textContent = reviewIssues.length ? `(${reviewIssues.length})` : '';
  $('#intentNote').textContent = currentIntent ? `写作意图：${currentIntent}` : '';
  $('#intentNote').classList.toggle('hidden', !currentIntent);
  const list = $('#issueList');
  list.textContent = '';
  if (!reviewIssues.length) {
    list.innerHTML = '<div class="insight"><span class="insight-mark green">✓</span><span><strong>No clear issues</strong><small>The draft reads naturally for its current level.</small></span></div>';
    return;
  }
  reviewIssues.forEach((issue, index) => {
    const item = document.createElement('div'); item.className = 'review-issue';
    const locate = document.createElement('button'); locate.type = 'button'; locate.className = 'issue-locate';
    const heading = document.createElement('strong'); heading.textContent = issue.category || 'wording';
    const quote = document.createElement('del'); quote.textContent = issue.quote;
    const arrow = document.createElement('span'); arrow.textContent = '→';
    const replacement = document.createElement('ins'); replacement.textContent = issue.replacement;
    const message = document.createElement('small'); message.textContent = issue.message;
    locate.append(heading, quote, arrow, replacement, message);
    locate.addEventListener('click', () => { editor.focus(); editor.setSelectionRange(issue.start, issue.end); });
    const apply = document.createElement('button'); apply.type = 'button'; apply.className = 'issue-apply'; apply.textContent = 'Apply 修改';
    apply.addEventListener('click', () => applyReviewIssue(index));
    item.append(locate, apply); list.appendChild(item);
  });
}

function applyReviewIssue(index) {
  const issue = reviewIssues[index];
  if (!issue) return;
  editor.setRangeText(issue.replacement, issue.start, issue.end, 'end');
  reviewIssues = []; renderMirror(); renderReview(); updateStats(); saveDraft(); scheduleCompletion(); scheduleReview();
  editor.focus(); notify('Suggestion applied');
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

function emailDraft() {
  const modalOpen = !$('#emailModal').classList.contains('hidden');
  const modalAddress = modalOpen ? $('#emailRecipientInput').value.trim() : '';
  return { to: modalAddress || $('#recipient').value.trim(), subject: $('#subject').value.trim(), body: editor.value };
}

function finishedDocuments() {
  try {
    const documents = JSON.parse(localStorage.getItem(FINISHED_KEY) || '[]');
    return Array.isArray(documents) ? documents : [];
  } catch {
    return [];
  }
}

function currentDocument() {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    format: $('#format').value,
    title: $('#title').value.trim() || 'Untitled document',
    recipient: $('#recipient').value.trim(),
    subject: $('#subject').value.trim(),
    text: editor.value,
    finishedAt: new Date().toISOString()
  };
}

function updateDocumentCounts() {
  $('#draftCount').textContent = '1';
  $('#finishedCount').textContent = String(finishedDocuments().length);
}

function showDocumentView(view) {
  const showingFinished = view === 'finished';
  $('#composeView').classList.toggle('hidden', showingFinished);
  $('#finishedView').classList.toggle('hidden', !showingFinished);
  $('#draftsNav').classList.toggle('active', !showingFinished);
  $('#finishedNav').classList.toggle('active', showingFinished);
  if (showingFinished) renderFinishedDocuments();
}

function formatFinishedDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently finished';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function renderFinishedDocuments() {
  const list = $('#finishedList');
  const documents = finishedDocuments();
  list.textContent = '';
  updateDocumentCounts();
  if (!documents.length) {
    const empty = document.createElement('div'); empty.className = 'archive-empty';
    const title = document.createElement('strong'); title.textContent = 'Nothing finished yet';
    const note = document.createElement('span'); note.textContent = 'Complete a letter, essay, or message and it will appear here.';
    empty.append(title, note); list.appendChild(empty); return;
  }
  documents.forEach(documentRecord => {
    const item = document.createElement('article'); item.className = 'finished-item'; item.dataset.finishedId = documentRecord.id;
    const copy = document.createElement('div'); copy.className = 'finished-copy';
    const title = document.createElement('strong'); title.textContent = documentRecord.title || 'Untitled document';
    const meta = document.createElement('div'); meta.className = 'finished-meta';
    const words = (documentRecord.text || '').trim().split(/\s+/).filter(Boolean).length;
    [documentRecord.format || 'document', formatFinishedDate(documentRecord.finishedAt), `${words} words`].forEach(value => {
      const detail = document.createElement('span'); detail.textContent = value; meta.appendChild(detail);
    });
    copy.append(title, meta);
    const actions = document.createElement('div'); actions.className = 'finished-actions';
    const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = 'Edit copy'; edit.dataset.finishedAction = 'edit';
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Delete'; remove.className = 'delete-finished'; remove.dataset.finishedAction = 'delete';
    actions.append(edit, remove); item.append(copy, actions); list.appendChild(item);
  });
}

function archiveCurrentDocument() {
  const documents = finishedDocuments();
  documents.unshift(currentDocument());
  localStorage.setItem(FINISHED_KEY, JSON.stringify(documents.slice(0, 50)));
  updateDocumentCounts();
}

function loadFinishedCopy(id) {
  const documentRecord = finishedDocuments().find(item => item.id === id);
  if (!documentRecord) return;
  const format = content[documentRecord.format] ? documentRecord.format : 'letter';
  $('#format').value = format; setFormat(format, false);
  $('#title').value = documentRecord.title || content[format].title;
  $('#recipient').value = documentRecord.recipient || '';
  $('#subject').value = documentRecord.subject || '';
  editor.value = documentRecord.text || '';
  editor.setSelectionRange(editor.value.length, editor.value.length);
  renderMirror(); updateStats(); saveDraft(); showDocumentView('drafts'); editor.focus();
  notify('Finished document copied to drafts');
}

function deleteFinishedDocument(id) {
  if (!window.confirm('Delete this finished document? This cannot be undone.')) return;
  const documents = finishedDocuments().filter(item => item.id !== id);
  localStorage.setItem(FINISHED_KEY, JSON.stringify(documents));
  renderFinishedDocuments(); notify('Finished document deleted');
}

function openEmailModal() {
  const draft = emailDraft();
  $('#emailRecipientInput').value = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.to) ? draft.to : '';
  $('#emailRecipientInput').setCustomValidity('');
  $('#emailSummarySubject').textContent = draft.subject || 'No subject';
  $('#emailModal').classList.remove('hidden');
  document.body.classList.add('modal-open');
  $('#emailRecipientInput').focus();
}

function closeEmailModal() {
  $('#emailModal').classList.add('hidden');
  document.body.classList.remove('modal-open');
  $('#finishButton').focus();
}

function openEmailProvider(provider) {
  const draft = emailDraft();
  const emailInput = $('#emailRecipientInput');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.to)) {
    emailInput.setCustomValidity('Enter a valid recipient email address');
    emailInput.reportValidity();
    emailInput.focus();
    return;
  }
  emailInput.setCustomValidity('');
  $('#recipient').value = draft.to;
  saveDraft();
  archiveCurrentDocument();
  const url = EnWriteCompletion.buildEmailComposeUrl(provider, draft);
  if (provider === 'default') window.location.href = url;
  else window.open(url, '_blank', 'noopener,noreferrer');
  closeEmailModal();
  notify('Email draft imported');
}

function closeDocumentMenu() {
  $('#documentMenu').classList.add('hidden');
  $('#moreButton').setAttribute('aria-expanded', 'false');
}

function toggleDocumentMenu() {
  const opening = $('#documentMenu').classList.contains('hidden');
  $('#documentMenu').classList.toggle('hidden', !opening);
  $('#moreButton').setAttribute('aria-expanded', String(opening));
  if (opening) document.querySelector('[data-doc-action="review"]').focus();
}

async function runDocumentAction(action) {
  closeDocumentMenu();
  if (action === 'review') return reviewDraft(true);
  if (action === 'copy') {
    const draftText = `${$('#title').value}\n\n${editor.value}`;
    try { await navigator.clipboard.writeText(draftText); notify('Draft copied'); }
    catch { notify('Clipboard access was blocked'); }
    return;
  }
  if (action === 'download') {
    const safeName = ($('#title').value || 'en-intellisense-draft').replace(/[\\/:*?"<>|]+/g, '-').trim();
    const blob = new Blob([editor.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `${safeName}.txt`; link.click();
    URL.revokeObjectURL(url); notify('Draft downloaded');
    return;
  }
  if (action === 'clear' && window.confirm('Clear this draft? This cannot be undone.')) {
    editor.value = ''; $('#subject').value = ''; $('#recipient').value = ''; $('#title').value = 'Untitled letter';
    reviewIssues = []; currentIntent = ''; renderMirror(); renderReview(); updateStats(); saveDraft(); editor.focus(); notify('Draft cleared');
  }
}

function friendlyModelError(message) {
  if (/connection|reach model|1005[34]|network|fetch/i.test(message || '')) {
    return '模型服务连接暂时中断，系统已自动重试，请稍后再试。';
  }
  return message || '模型服务暂时不可用，请稍后再试。';
}

function renderPhrases() {
  const phrases = content[$('#format').value].phrases;
  $('#phraseList').innerHTML = phrases.map((phrase, index) => {
    const shifted = phrases[(index + phraseOffset) % phrases.length];
    return `<button type="button" data-phrase="${shifted.replace(/"/g, '&quot;')}">${shifted.trim()}...</button>`;
  }).join('');
  document.querySelectorAll('[data-phrase]').forEach(button => button.addEventListener('click', () => {
    const range = currentTextRange();
    const phrase = `${button.dataset.phrase.trim()} `;
    editor.setRangeText(phrase, range.start, range.end, 'end');
    reviewIssues = []; renderMirror(); editor.focus(); updateStats(); scheduleCompletion(); scheduleReview(); saveDraft(); notify('Current sentence replaced');
  }));
}

function currentTextRange() {
  return EnWriteCompletion.getSentenceRange(editor.value, editor.selectionStart, editor.selectionEnd);
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
    $('#assistContent').textContent = friendlyModelError(error.message);
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
    thinking.textContent = friendlyModelError(error.message);
  }
}

function setFormat(format, reset = true) {
  const preset = content[format];
  $('#documentType').textContent = preset.eyebrow;
  $('#finishButton').firstChild.textContent = `${preset.finish} `;
  $('#addressFields').classList.toggle('hidden', format !== 'letter');
  $('#editorWrap').classList.toggle('standalone', format !== 'letter');
  if (reset) { $('#title').value = preset.title; editor.value = preset.text; }
  reviewIssues = []; currentIntent = ''; renderMirror(); renderReview();
  phraseOffset = 0; renderPhrases(); updateStats(); scheduleCompletion(); scheduleReview(); saveDraft();
}

function acceptSuggestion() {
  if (!activeSuggestion) return;
  editor.setRangeText(activeSuggestion, editor.selectionStart, editor.selectionEnd, 'end');
  dismissedValue = ''; reviewIssues = []; renderMirror(); updateStats(); clearSuggestion(); saveDraft(); scheduleReview(); editor.focus();
  setTimeout(scheduleCompletion, 50);
}

editor.addEventListener('input', () => { dismissedValue = ''; reviewIssues = []; renderMirror(); updateStats(); scheduleCompletion(); scheduleReview(); saveDraft(); });
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
$('#newDraftButton').addEventListener('click', () => { showDocumentView('drafts'); setFormat($('#format').value); });
$('#archiveNewDraft').addEventListener('click', () => { showDocumentView('drafts'); setFormat($('#format').value); });
$('#draftsNav').addEventListener('click', () => showDocumentView('drafts'));
$('#finishedNav').addEventListener('click', () => showDocumentView('finished'));
$('#finishedList').addEventListener('click', event => {
  const action = event.target.closest('[data-finished-action]');
  if (!action) return;
  const item = action.closest('[data-finished-id]');
  if (action.dataset.finishedAction === 'edit') loadFinishedCopy(item.dataset.finishedId);
  else deleteFinishedDocument(item.dataset.finishedId);
});
$('#refreshPhrases').addEventListener('click', () => { phraseOffset = (phraseOffset + 1) % 3; renderPhrases(); notify('Phrase ideas refreshed'); });
$('#reviewDraft').addEventListener('click', () => reviewDraft(true));
$('#finishButton').addEventListener('click', () => {
  if ($('#format').value === 'letter') openEmailModal();
  else {
    archiveCurrentDocument(); showDocumentView('finished');
    notify(`${content[$('#format').value].finish} saved to Finished`);
  }
});
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
$('#closeEmailModal').addEventListener('click', closeEmailModal);
$('#emailBackdrop').addEventListener('click', closeEmailModal);
$('#emailRecipientInput').addEventListener('input', event => event.currentTarget.setCustomValidity(''));
document.querySelectorAll('[data-email-provider]').forEach(button => button.addEventListener('click', () => openEmailProvider(button.dataset.emailProvider)));
$('#copyEmailDraft').addEventListener('click', async () => {
  const draft = emailDraft();
  const completeEmail = `To: ${draft.to}\nSubject: ${draft.subject}\n\n${draft.body}`;
  try { await navigator.clipboard.writeText(completeEmail); notify('Complete email copied'); }
  catch { notify('Clipboard access was blocked'); }
});
$('#moreButton').addEventListener('click', event => { event.stopPropagation(); toggleDocumentMenu(); });
document.querySelectorAll('[data-doc-action]').forEach(button => button.addEventListener('click', () => runDocumentAction(button.dataset.docAction)));
document.addEventListener('click', event => {
  if (!event.target.closest('.more-menu-wrap')) closeDocumentMenu();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !$('#emailModal').classList.contains('hidden')) closeEmailModal();
  if (event.key === 'Escape' && !$('#documentMenu').classList.contains('hidden')) { closeDocumentMenu(); $('#moreButton').focus(); }
});
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
renderMirror();
updateStats(); renderPhrases(); scheduleCompletion(); checkModel();
updateDocumentCounts();
