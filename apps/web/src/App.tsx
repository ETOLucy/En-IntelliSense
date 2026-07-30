import { useEffect, useMemo, useRef, useState } from 'react';
import type { EditorView } from '@codemirror/view';
import {
  Bot, BookPlus, CalendarDays, Check, ChevronRight, CircleAlert, Eye, FileOutput, FilePlus2, Files,
  FolderOpen, History, Languages, ListTree, PanelRight, Pencil, RotateCcw, Save,
  Settings2, Sparkles, Trash2, X,
} from 'lucide-react';
import type {
  AiConsent, ByokConfig, ByokProviderId, EnglishVariant, LearnerLevel, Revision, UiLocale,
  WritingDiagnostic, WritingFormat,
} from '@writemelo/contracts';
import { t } from '@writemelo/i18n';
import {
  compareRevisions,
  shouldCreateSnapshot,
  snapshotIdsToPrune,
  summarizeRevision,
} from '@writemelo/revision-core';
import {
  createSpellChecker, getChecklist, getLocalDiagnostics, getOutline, getSpellingDiagnostics,
  type SpellChecker,
} from '@writemelo/writing-core';
import { db, type LocalDocument } from './db';
import { Editor } from './Editor';
import { mergePersonalWords, parseDictionary } from './dictionary-import';
import {
  diagnosticCategoryLabel,
  formatLabel,
  levelLabel,
  localizeDiagnostic,
  revisionSummaryLabel,
} from './diagnostic-copy';
import { openDictionaryFile, openTextFile, saveTextFile } from './file-access';
import { RevisionPreview } from './RevisionPreview';
import {
  addWritingActivity,
  localDateKey,
  writingStreak,
  type WritingActivity,
} from './writing-activity';

const starterText = `Dear Alex,

i am writing to follow up on our meeting. I very like the direction we discussed, and I believe it will give our team more convenience.

Please reply me when you have time.

Best regards,
Melo`;

type RightTab = 'issues' | 'outline' | 'history' | 'ai';
type AiAccessMode = 'off' | 'question' | 'document';

const providerDefaults: Record<ByokProviderId, { label: string; baseUrl: string; model: string }> = {
  openai: { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4.1-mini' },
  groq: { label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
  together: { label: 'Together AI', baseUrl: 'https://api.together.xyz/v1', model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo' },
  openrouter: { label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4.1-mini' },
  ollama: { label: 'Ollama (local)', baseUrl: 'http://127.0.0.1:11434/v1', model: 'llama3.2' },
  custom: { label: 'Custom compatible', baseUrl: 'https://api.example.com/v1', model: '' },
};

function makeDocument(): LocalDocument {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(), title: 'Project follow-up', titleSource: 'derived', text: starterText,
    format: 'letter', level: 'natural', variant: 'en-US', updatedAt: now,
  };
}

function deriveTitle(text: string, fallback: string) {
  const line = text.split(/\r?\n/).find(value => value.trim().length > 0)?.trim();
  return line?.slice(0, 48) || fallback;
}

function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function App() {
  const [locale, setLocale] = useState<UiLocale>(() => (localStorage.getItem('locale') as UiLocale) || 'zh-CN');
  const [documents, setDocuments] = useState<LocalDocument[]>([]);
  const [activeId, setActiveId] = useState('');
  const [rightTab, setRightTab] = useState<RightTab>('issues');
  const [inspectorOpen, setInspectorOpen] = useState(() => !window.matchMedia('(max-width: 760px)').matches);
  const [selectedIssue, setSelectedIssue] = useState<string>();
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved');
  const [showSettings, setShowSettings] = useState(false);
  const [renameTarget, setRenameTarget] = useState<LocalDocument>();
  const [renameValue, setRenameValue] = useState('');
  const [showConsent, setShowConsent] = useState(false);
  const [aiModeDraft, setAiModeDraft] = useState<AiAccessMode>('off');
  const [spellChecker, setSpellChecker] = useState<SpellChecker>();
  const [personalWords, setPersonalWords] = useState<string[]>(() => JSON.parse(localStorage.getItem('personal-words') ?? '[]') as string[]);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [selectedRevision, setSelectedRevision] = useState<Revision>();
  const [restoreCandidate, setRestoreCandidate] = useState<Revision>();
  const [undoDocument, setUndoDocument] = useState<LocalDocument>();
  const [aiConsent, setAiConsent] = useState<AiConsent>(() => {
    const raw = localStorage.getItem('ai-consent');
    return raw ? JSON.parse(raw) as AiConsent : {
      mode: 'off', allowFullDocument: false, updatedAt: new Date(0).toISOString(),
    };
  });
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiReply, setAiReply] = useState('');
  const [aiError, setAiError] = useState('');
  const [aiPending, setAiPending] = useState(false);
  const [byokConfig, setByokConfig] = useState<ByokConfig | null>(null);
  const [byokProvider, setByokProvider] = useState<ByokProviderId>('openai');
  const [byokBaseUrl, setByokBaseUrl] = useState(providerDefaults.openai.baseUrl);
  const [byokModel, setByokModel] = useState(providerDefaults.openai.model);
  const [byokApiKey, setByokApiKey] = useState('');
  const [byokMessage, setByokMessage] = useState('');
  const [byokSaving, setByokSaving] = useState(false);
  const [writingActivity, setWritingActivity] = useState<WritingActivity>(() => {
    const raw = localStorage.getItem('writing-activity');
    return raw ? JSON.parse(raw) as WritingActivity : { days: {} };
  });
  const [dirtyFiles, setDirtyFiles] = useState<Set<string>>(() => new Set());
  const [fileMessage, setFileMessage] = useState('');
  const [dictionaryMessage, setDictionaryMessage] = useState('');
  const editorRef = useRef<EditorView | undefined>(undefined);
  const saveTimer = useRef<number | undefined>(undefined);
  const saveBaseline = useRef<{ documentId: string; text: string } | undefined>(undefined);

  useEffect(() => {
    void db.documents.orderBy('updatedAt').reverse().toArray().then(async rows => {
      if (rows.length) {
        setDocuments(rows);
        setActiveId(rows[0]!.id);
      } else {
        const first = makeDocument();
        await db.documents.add(first);
        setDocuments([first]);
        setActiveId(first.id);
      }
    });
  }, []);

  useEffect(() => {
    void Promise.all([
      fetch('./dictionary/en.aff').then(response => response.text()),
      fetch('./dictionary/en.dic').then(response => response.text()),
    ]).then(([aff, dic]) => setSpellChecker(createSpellChecker(aff, dic, personalWords))).catch(() => {
      // Grammar and completion remain available if dictionary assets cannot be loaded.
    });
  }, [personalWords]);

  useEffect(() => {
    if (!activeId) return;
    void db.revisions.where('documentId').equals(activeId).sortBy('createdAt')
      .then(items => setRevisions(items.reverse().slice(0, 30)));
    setSelectedRevision(undefined);
    setRestoreCandidate(undefined);
    setUndoDocument(undefined);
  }, [activeId]);

  useEffect(() => {
    const bridge = window.writeMeloDesktop?.byok;
    if (!bridge) return;
    void bridge.getConfig().then(config => {
      if (!config) return;
      setByokConfig(config);
      setByokProvider(config.providerId);
      setByokBaseUrl(config.baseUrl);
      setByokModel(config.model);
    }).catch(error => setByokMessage(error instanceof Error ? error.message : 'Could not read AI settings.'));
  }, []);

  const active = documents.find(item => item.id === activeId);
  useEffect(() => {
    function handleSaveShortcut(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') return;
      event.preventDefault();
      void saveDocument(false);
    }
    window.addEventListener('keydown', handleSaveShortcut);
    return () => window.removeEventListener('keydown', handleSaveShortcut);
  }, [active]);

  const context = useMemo(() => active ? ({
    format: active.format, level: active.level, variant: active.variant,
    audience: '', tone: 'professional', personalWords,
  }) : undefined, [active?.format, active?.level, active?.variant, personalWords]);
  const rawDiagnostics = useMemo(
    () => active && context ? [
      ...getLocalDiagnostics({ ...context, text: active.text, cursor: active.text.length }),
      ...(spellChecker ? getSpellingDiagnostics({ ...context, text: active.text, cursor: active.text.length }, spellChecker) : []),
    ].sort((left, right) => left.start - right.start) : [],
    [active?.text, context, spellChecker],
  );
  const diagnostics = useMemo(
    () => rawDiagnostics.map(diagnostic => localizeDiagnostic(diagnostic, locale)),
    [rawDiagnostics, locale],
  );
  const outline = useMemo(
    () => active && context ? getOutline({ ...context, text: active.text, cursor: active.text.length }) : [],
    [active?.text, context],
  );
  const checklist = useMemo(
    () => active && context ? getChecklist({ ...context, text: active.text, cursor: active.text.length }) : [],
    [active?.text, context],
  );
  const wordCount = active ? countWords(active.text) : 0;
  const todayKey = localDateKey(new Date());
  const todayWords = writingActivity.days[todayKey] ?? 0;
  const streak = writingStreak(writingActivity, new Date());
  const revisionComparison = useMemo(
    () => active && selectedRevision
      ? compareRevisions(selectedRevision.text, active.text, 'words')
      : undefined,
    [active?.text, selectedRevision],
  );

  function persist(next: LocalDocument, source: Revision['source'] = 'user') {
    if (!saveBaseline.current || saveBaseline.current.documentId !== next.id) {
      saveBaseline.current = {
        documentId: next.id,
        text: active?.id === next.id ? active.text : next.text,
      };
    }
    const beforeText = saveBaseline.current.text;
    if (active?.id === next.id && active.text !== next.text && active.fileReference) {
      setDirtyFiles(current => new Set(current).add(next.id));
    }
    setDocuments(items => items.map(item => item.id === next.id ? next : item));
    setSaveState('saving');
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      if (saveBaseline.current?.documentId === next.id) saveBaseline.current = undefined;
      const revision: Revision = {
        id: crypto.randomUUID(), documentId: next.id, text: next.text, source,
        createdAt: new Date().toISOString(), summary: '',
      };
      void db.transaction('rw', db.documents, db.revisions, async () => {
        await db.documents.put(next);
        const existing = await db.revisions.where('documentId').equals(next.id).toArray();
        let previous = [...existing].sort((left, right) =>
          Date.parse(right.createdAt) - Date.parse(left.createdAt))[0];
        const saved: Revision[] = [];
        if (!previous && beforeText !== next.text) {
          previous = {
            id: crypto.randomUUID(),
            documentId: next.id,
            text: beforeText,
            source: 'user',
            createdAt: new Date(Date.parse(revision.createdAt) - 1).toISOString(),
            summary: 'Initial version',
          };
          await db.revisions.put(previous);
          saved.push(previous);
        }
        revision.summary = previous
          ? summarizeRevision(previous.text, next.text)
          : 'Initial version';
        if (shouldCreateSnapshot(previous, revision, source !== 'user')) {
          await db.revisions.put(revision);
          saved.unshift(revision);
        }
        const all = await db.revisions.where('documentId').equals(next.id).toArray();
        const pruneIds = snapshotIdsToPrune(all);
        if (pruneIds.length) await db.revisions.bulkDelete(pruneIds);
        return saved;
      }).then(savedRevisions => {
        if (savedRevisions.length && savedRevisions[0]?.documentId === activeId) {
          setRevisions(items => [...savedRevisions, ...items]
            .filter((item, index, all) => all.findIndex(candidate => candidate.id === item.id) === index)
            .slice(0, 30));
        }
        setSaveState('saved');
      });
    }, 450);
  }

  function changeText(text: string) {
    if (!active) return;
    const addedWords = Math.max(0, countWords(text) - countWords(active.text));
    if (addedWords) {
      setWritingActivity(current => {
        const next = addWritingActivity(current, localDateKey(new Date()), addedWords);
        localStorage.setItem('writing-activity', JSON.stringify(next));
        return next;
      });
    }
    persist({
      ...active,
      text,
      title: active.titleSource === 'custom'
        ? active.title
        : deriveTitle(text, t(locale, 'untitled')),
      updatedAt: new Date().toISOString(),
    });
  }

  function openRename(document: LocalDocument) {
    setRenameTarget(document);
    setRenameValue(document.title);
  }

  async function renameDocument() {
    const title = renameValue.trim();
    if (!renameTarget || !title) return;
    const next = { ...renameTarget, title, titleSource: 'custom' as const, updatedAt: new Date().toISOString() };
    await db.documents.put(next);
    setDocuments(items => items.map(item => item.id === next.id ? next : item));
    setRenameTarget(undefined);
  }

  function applyIssue(issue: WritingDiagnostic) {
    const fix = issue.fixes.find(item => item.edit)?.edit;
    if (!active || !fix) return;
    const text = active.text.slice(0, fix.start) + fix.insert + active.text.slice(fix.end);
    persist({ ...active, text, updatedAt: new Date().toISOString() }, 'local-fix');
    editorRef.current?.focus();
    setSelectedIssue(undefined);
  }

  function addIssueWord(issue: WritingDiagnostic) {
    if (!active) return;
    const word = active.text.slice(issue.start, issue.end);
    if (!word || personalWords.some(item => item.toLowerCase() === word.toLowerCase())) return;
    const next = [...personalWords, word].sort((left, right) => left.localeCompare(right));
    localStorage.setItem('personal-words', JSON.stringify(next));
    setPersonalWords(next);
    setSelectedIssue(undefined);
  }

  function restoreRevision() {
    if (!active || !restoreCandidate) return;
    setUndoDocument(active);
    persist({
      ...active,
      text: restoreCandidate.text,
      title: active.titleSource === 'custom'
        ? active.title
        : deriveTitle(restoreCandidate.text, t(locale, 'untitled')),
      updatedAt: new Date().toISOString(),
    }, 'restore');
    setRestoreCandidate(undefined);
    setSelectedRevision(undefined);
    editorRef.current?.focus();
  }

  function undoRestore() {
    if (!undoDocument) return;
    persist({ ...undoDocument, updatedAt: new Date().toISOString() }, 'restore');
    setUndoDocument(undefined);
  }

  async function createDocument() {
    const next = { ...makeDocument(), title: t(locale, 'untitled'), text: '' };
    await db.documents.add(next);
    setDocuments(items => [next, ...items]);
    setActiveId(next.id);
  }

  async function openDocumentFile() {
    setFileMessage('');
    try {
      const opened = await openTextFile();
      if (!opened) return;
      const now = new Date().toISOString();
      const next: LocalDocument = {
        id: crypto.randomUUID(),
        title: opened.name,
        titleSource: 'custom',
        fileName: opened.name,
        fileReference: opened.reference,
        text: opened.content,
        format: opened.name.toLowerCase().endsWith('.md') || opened.name.toLowerCase().endsWith('.markdown')
          ? 'essay'
          : 'letter',
        level: 'natural',
        variant: 'en-US',
        updatedAt: now,
      };
      await db.documents.add(next);
      setDocuments(items => [next, ...items]);
      setActiveId(next.id);
      setFileMessage(locale === 'en' ? `Opened ${opened.name}` : `已打开 ${opened.name}`);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setFileMessage(error instanceof Error ? error.message : 'Could not open the file.');
    }
  }

  async function saveDocument(saveAs: boolean) {
    if (!active) return;
    setFileMessage('');
    try {
      const saved = await saveTextFile({
        ...(active.fileReference ? { reference: active.fileReference } : {}),
        suggestedName: active.fileName ?? `${active.title.replace(/[<>:"/\\|?*]/g, '-').trim() || 'Untitled'}.md`,
        content: active.text,
        saveAs,
      });
      if (!saved) return;
      const next = {
        ...active,
        fileName: saved.name,
        fileReference: saved.reference,
        updatedAt: new Date().toISOString(),
      };
      await db.documents.put(next);
      setDocuments(items => items.map(item => item.id === next.id ? next : item));
      setDirtyFiles(current => {
        const updated = new Set(current);
        updated.delete(next.id);
        return updated;
      });
      setFileMessage(locale === 'en' ? `Saved ${saved.name}` : `已保存 ${saved.name}`);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setFileMessage(error instanceof Error ? error.message : 'Could not save the file.');
    }
  }

  async function importDictionary() {
    setDictionaryMessage('');
    try {
      const opened = await openDictionaryFile();
      if (!opened) return;
      const parsed = parseDictionary(opened.content);
      const next = mergePersonalWords(personalWords, parsed.words);
      const importedCount = next.length - personalWords.length;
      localStorage.setItem('personal-words', JSON.stringify(next));
      setPersonalWords(next);
      setDictionaryMessage(locale === 'en'
        ? `Imported ${importedCount.toLocaleString()} new words from ${opened.name}${parsed.rejected ? `; skipped ${parsed.rejected}` : ''}.`
        : `已从 ${opened.name} 导入 ${importedCount.toLocaleString()} 个新词${parsed.rejected ? `，跳过 ${parsed.rejected} 条无效内容` : ''}。`);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setDictionaryMessage(error instanceof Error ? error.message : 'Could not import the dictionary.');
    }
  }

  async function deleteDocument() {
    if (!active || documents.length === 1) return;
    await db.documents.delete(active.id);
    const remaining = documents.filter(item => item.id !== active.id);
    setDocuments(remaining);
    setActiveId(remaining[0]!.id);
    setShowSettings(false);
  }

  function patchActive(patch: Partial<LocalDocument>) {
    if (!active) return;
    persist({ ...active, ...patch, updatedAt: new Date().toISOString() });
  }

  function openAiSettings() {
    setAiModeDraft(aiConsent.mode === 'off'
      ? 'off'
      : aiConsent.allowFullDocument ? 'document' : 'question');
    setShowConsent(true);
  }

  function confirmAi() {
    const consent: AiConsent = {
      mode: aiModeDraft === 'off' ? 'off' : 'manual',
      allowFullDocument: aiModeDraft === 'document',
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem('ai-consent', JSON.stringify(consent));
    setAiConsent(consent);
    setShowConsent(false);
  }

  function changeProvider(providerId: ByokProviderId) {
    const defaults = providerDefaults[providerId];
    setByokProvider(providerId);
    setByokBaseUrl(defaults.baseUrl);
    setByokModel(defaults.model);
    setByokApiKey('');
    setByokMessage('');
  }

  async function saveByok() {
    const bridge = window.writeMeloDesktop?.byok;
    if (!bridge || byokSaving) return;
    setByokSaving(true);
    setByokMessage('');
    try {
      const saved = await bridge.saveConfig({
        providerId: byokProvider,
        baseUrl: byokBaseUrl,
        model: byokModel,
        ...(byokApiKey ? { apiKey: byokApiKey } : {}),
      });
      setByokConfig(saved);
      setByokApiKey('');
      setByokMessage(locale === 'en' ? 'Saved with Windows encryption.' : '已使用 Windows 加密保存。');
    } catch (error) {
      setByokMessage(error instanceof Error ? error.message : 'Could not save AI settings.');
    } finally {
      setByokSaving(false);
    }
  }

  async function clearByok() {
    const bridge = window.writeMeloDesktop?.byok;
    if (!bridge) return;
    await bridge.clearConfig();
    setByokConfig(null);
    setByokApiKey('');
    setByokMessage(locale === 'en' ? 'Provider removed.' : '已移除供应商配置。');
  }

  async function askAi() {
    if (aiConsent.mode === 'off' || !aiQuestion.trim() || aiPending || !active) return;
    setAiPending(true);
    setAiError('');
    setAiReply('');
    try {
      const desktopByok = window.writeMeloDesktop?.byok;
      if (desktopByok && byokConfig) {
        const result = await desktopByok.chat({
          message: aiQuestion.trim(),
          context: aiConsent.allowFullDocument ? active.text : '',
          language: locale === 'zh-CN' ? 'Simplified Chinese' : 'English',
        });
        setAiReply(result.reply);
        return;
      }
      const configuredBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
      if (window.location.protocol === 'file:' && !configuredBase) {
        throw new Error(locale === 'en' ? 'No hosted AI service is configured for this build.' : '此版本尚未配置托管 AI 服务。');
      }
      const endpoint = configuredBase ? new URL('/api/chat', configuredBase).toString() : '/api/chat';
      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: aiQuestion.trim(),
          context: aiConsent.allowFullDocument ? active.text : '',
          selection: '',
          language: locale === 'zh-CN' ? 'Simplified Chinese' : 'English',
          history: [],
        }),
      });
      const data = await response.json() as { reply?: string; error?: string };
      if (!response.ok || !data.reply) throw new Error(data.error || `Request failed (${response.status})`);
      setAiReply(data.reply);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'AI request failed');
    } finally {
      setAiPending(false);
    }
  }

  if (!active || !context) return <main className="loading">WriteMelo</main>;

  return (
    <main className="workbench">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">W</span><strong>WriteMelo</strong></div>
        <div className="document-state">
          <span className="document-title">{active.title}</span>
          <span className="save-state"><Check size={14} />{t(locale, saveState)}</span>
        </div>
        <div className="top-actions">
          <span className="status-chip"><span className="status-dot" />{t(locale, 'localOnly')}</span>
          <button className="icon-text" onClick={() => { const next = locale === 'en' ? 'zh-CN' : 'en'; setLocale(next); localStorage.setItem('locale', next); }} title="Language">
            <Languages size={17} />{locale === 'en' ? '中' : 'EN'}
          </button>
          <button className="icon-button inspector-toggle" onClick={() => setInspectorOpen(value => !value)} title={t(locale, 'issues')}><PanelRight size={18} /></button>
          <button className="icon-button" onClick={() => setShowSettings(value => !value)} title={t(locale, 'settings')}><Settings2 size={18} /></button>
        </div>
      </header>

      <div className="workspace">
        <aside className="documents-pane">
          <div className="pane-heading"><span><Files size={16} />{t(locale, 'documents')}</span><div className="pane-actions">
            <button className="icon-button small" onClick={() => void openDocumentFile()} title={locale === 'en' ? 'Open text file' : '打开文本文件'}><FolderOpen size={16} /></button>
            <button className="icon-button small" onClick={() => void createDocument()} title={t(locale, 'newDocument')}><FilePlus2 size={17} /></button>
          </div></div>
          <nav className="document-list">
            {documents.map(item => <div key={item.id} className={item.id === active.id ? 'document-row active' : 'document-row'}>
              <button className="document-item" onClick={() => setActiveId(item.id)}>
                <span>{item.title}</span><small>{new Date(item.updatedAt).toLocaleDateString(locale)}</small>
              </button>
              <button className="icon-button small rename-document" onClick={() => openRename(item)} title={locale === 'en' ? 'Rename document' : '重命名文档'}><Pencil size={14} /></button>
            </div>)}
          </nav>
        </aside>

        <section className="editor-pane">
          <div className="editor-toolbar">
            <div className="segmented">
              {(['letter', 'essay', 'message'] as WritingFormat[]).map(format =>
                <button key={format} className={active.format === format ? 'selected' : ''} onClick={() => patchActive({ format })}>{formatLabel(format, locale)}</button>)}
            </div>
            <div className="file-actions">
              <button className="icon-button small" onClick={() => void saveDocument(false)} title={locale === 'en' ? 'Save file (Ctrl+S)' : '保存文件 (Ctrl+S)'}><Save size={15} /></button>
              <button className="icon-button small" onClick={() => void saveDocument(true)} title={locale === 'en' ? 'Save as' : '另存为'}><FileOutput size={15} /></button>
            </div>
            <div className="writing-progress" title={locale === 'en' ? 'Stored only on this device' : '仅保存在此设备'}>
              <span>{wordCount} {t(locale, 'words')}</span>
              <span><CalendarDays size={14} />{locale === 'en' ? `${todayWords} today · ${streak} day streak` : `今日 ${todayWords} 词 · 连续 ${streak} 天`}</span>
            </div>
          </div>
          <Editor value={active.text} context={context} diagnostics={diagnostics} locale={locale} spellChecker={spellChecker} onChange={changeText} onReady={view => { editorRef.current = view; }} />
          <footer className="editor-footer">
            <span>{active.fileName
              ? `${active.fileName}${dirtyFiles.has(active.id) ? (locale === 'en' ? ' · not written to file' : ' · 未写回文件') : ''}`
              : active.variant === 'en-US' ? 'English (US)' : 'English (UK)'}</span>
            <span>{diagnostics.length ? `${diagnostics.length} ${t(locale, 'issues').toLowerCase()}` : t(locale, 'noIssues')}</span>
          </footer>
          {fileMessage && <div className="file-message" role="status">{fileMessage}</div>}
        </section>

        <aside className={`inspector-pane ${inspectorOpen ? 'open' : 'closed'}`}>
          <div className="tabs" role="tablist">
            <button className={rightTab === 'issues' ? 'active' : ''} onClick={() => setRightTab('issues')}><CircleAlert size={16} />{t(locale, 'issues')}<b>{diagnostics.length}</b></button>
            <button className={rightTab === 'outline' ? 'active' : ''} onClick={() => setRightTab('outline')}><ListTree size={16} />{t(locale, 'outline')}</button>
            <button className={rightTab === 'history' ? 'active' : ''} onClick={() => setRightTab('history')} title={t(locale, 'revisionHistory')}><History size={16} /></button>
            <button className={rightTab === 'ai' ? 'active' : ''} onClick={() => setRightTab('ai')}><Bot size={16} />{t(locale, 'assistant')}</button>
          </div>
          <div className="inspector-content">
            {rightTab === 'issues' && (diagnostics.length ? diagnostics.map(issue =>
              <button key={issue.id} className={`issue ${selectedIssue === issue.id ? 'selected' : ''}`} onClick={() => {
                setSelectedIssue(issue.id);
                editorRef.current?.dispatch({
                  selection: { anchor: issue.start, head: issue.end },
                  scrollIntoView: true,
                });
                editorRef.current?.focus();
              }}>
                <span className={`severity ${issue.severity}`} /><span><strong>{issue.message}</strong><small>{diagnosticCategoryLabel(issue.category, locale)}</small></span><ChevronRight size={15} />
              </button>) : <div className="empty-state"><Check size={24} /><p>{t(locale, 'noIssues')}</p></div>)}
            {rightTab === 'issues' && diagnostics.find(item => item.id === selectedIssue) && (() => {
              const issue = diagnostics.find(item => item.id === selectedIssue)!;
              return <div className="issue-detail"><p>{issue.explanation}</p><div className="fix-actions">{issue.fixes.map(fix =>
                <button key={fix.id} className={fix.edit ? 'primary' : 'secondary'} onClick={() => fix.edit ? applyIssue(issue) : fix.action === 'add-to-dictionary' ? addIssueWord(issue) : undefined}>{fix.title}</button>
              )}</div></div>;
            })()}
            {rightTab === 'outline' && <>
              <h3>{t(locale, 'outline')}</h3>
              <div className="outline-list">{outline.map(item => <button key={item.id} onClick={() => editorRef.current?.dispatch({ selection: { anchor: item.start }, scrollIntoView: true })}><span>{item.label}</span><small>{item.note}</small></button>)}</div>
              <h3>{t(locale, 'checklist')}</h3>
              <ul className="checklist">{checklist.map(item => <li key={item.id} className={item.passed ? 'passed' : ''}><span>{item.passed ? <Check size={14} /> : <CircleAlert size={14} />}</span>{item.label}</li>)}</ul>
            </>}
            {rightTab === 'history' && <div className="history-panel">
              <div className="history-heading"><h3>{t(locale, 'revisionHistory')}</h3>
                {undoDocument && <button className="secondary icon-text" onClick={undoRestore}><RotateCcw size={14} />{locale === 'en' ? 'Undo restore' : '撤销恢复'}</button>}
              </div>
              {revisions.length ? revisions.map(revision => <div className="revision" key={revision.id}>
                <div><strong>{revisionSummaryLabel(revision.summary, locale)}</strong><small>{new Date(revision.createdAt).toLocaleString(locale)}</small></div>
                <div className="revision-actions">
                  <button className="icon-button small" onClick={() => setSelectedRevision(revision)} title={locale === 'en' ? 'Preview changes' : '预览变更'}><Eye size={15} /></button>
                  <button className="secondary" onClick={() => {
                    setSelectedRevision(revision);
                    setRestoreCandidate(revision);
                  }}>{t(locale, 'restore')}</button>
                </div>
              </div>) : <div className="empty-state"><History size={24} /><p>{locale === 'en' ? 'History appears as you edit.' : '编辑后将在这里显示历史。'}</p></div>}
              {revisionComparison && selectedRevision && <>
                <div className="preview-heading"><strong>{locale === 'en' ? 'Compared with current' : '与当前版本比较'}</strong><button className="icon-button small" onClick={() => setSelectedRevision(undefined)} title={locale === 'en' ? 'Close preview' : '关闭预览'}><X size={15} /></button></div>
                <RevisionPreview comparison={revisionComparison} locale={locale} />
              </>}
            </div>}
            {rightTab === 'ai' && <div className="ai-panel">
              <div className="ai-heading"><Sparkles size={22} /><div><h3>{t(locale, 'aiTitle')}</h3><p>{t(locale, 'aiDescription')}</p></div></div>
              <div className="privacy-row"><span>{aiConsent.mode === 'off'
                ? t(locale, 'aiOff')
                : aiConsent.allowFullDocument
                  ? (locale === 'en' ? 'On demand: question + full document' : '按需调用：问题 + 当前全文')
                  : (locale === 'en' ? 'On demand: question only' : '按需调用：仅发送问题')}</span><button className="secondary" onClick={openAiSettings}>{aiConsent.mode === 'off' ? t(locale, 'enableAi') : t(locale, 'settings')}</button></div>
              {window.writeMeloDesktop?.byok && <section className="byok-settings">
                <h3>{locale === 'en' ? 'Your AI provider' : '自备 AI 服务'}</h3>
                <p>{locale === 'en' ? 'The provider receives only text you explicitly send and may charge your account.' : '供应商只会收到你主动发送的文本，并可能向你的账号收费。'}</p>
                <label>{locale === 'en' ? 'Provider' : '供应商'}
                  <select value={byokProvider} onChange={event => changeProvider(event.target.value as ByokProviderId)}>
                    {(Object.entries(providerDefaults) as Array<[ByokProviderId, typeof providerDefaults.openai]>).map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}
                  </select>
                </label>
                <label>{locale === 'en' ? 'Compatible endpoint' : '兼容接口地址'}<input value={byokBaseUrl} onChange={event => setByokBaseUrl(event.target.value)} /></label>
                <label>{locale === 'en' ? 'Model ID' : '模型 ID'}<input value={byokModel} onChange={event => setByokModel(event.target.value)} /></label>
                {byokProvider !== 'ollama' && <label>API Key<input type="password" autoComplete="off" value={byokApiKey} onChange={event => setByokApiKey(event.target.value)} placeholder={byokConfig?.hasApiKey ? (locale === 'en' ? 'Saved securely; leave blank to keep' : '已安全保存；留空则保留') : ''} /></label>}
                <div className="byok-actions"><button className="primary" disabled={byokSaving || !byokModel.trim()} onClick={() => void saveByok()}>{byokSaving ? (locale === 'en' ? 'Saving...' : '保存中……') : (locale === 'en' ? 'Save provider' : '保存供应商')}</button>{byokConfig && <button className="secondary" onClick={() => void clearByok()}>{locale === 'en' ? 'Remove' : '移除'}</button>}</div>
                {byokMessage && <p className="byok-message" aria-live="polite">{byokMessage}</p>}
              </section>}
              {!window.writeMeloDesktop?.byok && <section className="ai-service-status">
                <strong>{locale === 'en' ? 'AI service for this preview' : '当前预览的 AI 服务'}</strong>
                <p>{import.meta.env.VITE_API_BASE_URL
                  ? (locale === 'en' ? 'Requests use the hosted service configured for this build.' : '请求将使用此构建配置的托管服务。')
                  : (locale === 'en'
                    ? 'This browser preview has no hosted AI service. Open the desktop app to configure your own provider with secure Windows storage.'
                    : '此浏览器调试页未配置托管 AI 服务。请打开桌面版，使用 Windows 安全存储配置自己的供应商。')}</p>
              </section>}
              <textarea aria-label="AI question" value={aiQuestion} onChange={event => setAiQuestion(event.target.value)} placeholder={locale === 'en' ? 'Ask about your writing...' : '询问你的英文表达……'} disabled={aiConsent.mode === 'off' || aiPending} />
              <button className="primary full" disabled={aiConsent.mode === 'off' || !aiQuestion.trim() || aiPending} onClick={() => void askAi()}>{aiPending ? (locale === 'en' ? 'Sending...' : '发送中……') : t(locale, 'askAi')}</button>
              {aiReply && <div className="ai-result" aria-live="polite">{aiReply}</div>}
              {aiError && <div className="ai-error" role="alert">{aiError}</div>}
            </div>}
          </div>
        </aside>
      </div>

      {showSettings && <div className="popover settings-popover">
        <div className="popover-title"><strong>{t(locale, 'settings')}</strong><button className="icon-button small" onClick={() => setShowSettings(false)}><X size={17} /></button></div>
        <label>{t(locale, 'variant')}<select value={active.variant} onChange={event => patchActive({ variant: event.target.value as EnglishVariant })}><option value="en-US">English (US)</option><option value="en-GB">English (UK)</option></select></label>
        <label>{t(locale, 'level')}<select value={active.level} onChange={event => patchActive({ level: event.target.value as LearnerLevel })}>{(['simple', 'natural', 'advanced'] as LearnerLevel[]).map(level => <option value={level} key={level}>{levelLabel(level, locale)}</option>)}</select></label>
        <div className="dictionary-status">
          <strong>{locale === 'en' ? 'Local spelling dictionary' : '本地拼写词典'}</strong>
          <span>{locale === 'en'
            ? `49,568 built-in · ${personalWords.length.toLocaleString()} personal`
            : `内置 49,568 条 · 个人词 ${personalWords.length.toLocaleString()} 条`}</span>
          <small>{locale === 'en'
            ? 'Source: dictionary-en 4.0.0. Import .txt or Hunspell .dic files.'
            : '来源：dictionary-en 4.0.0。可导入 .txt 或 Hunspell .dic 文件。'}</small>
          <button className="secondary icon-text" onClick={() => void importDictionary()}><BookPlus size={15} />{locale === 'en' ? 'Import dictionary' : '导入词典'}</button>
          {dictionaryMessage && <p role="status">{dictionaryMessage}</p>}
        </div>
        <button className="danger" disabled={documents.length === 1} onClick={() => void deleteDocument()}><Trash2 size={16} />{t(locale, 'deleteDocument')}</button>
      </div>}

      {renameTarget && <div className="modal-backdrop" role="presentation">
        <section className="modal rename-modal" role="dialog" aria-modal="true" aria-labelledby="rename-title">
          <div className="modal-icon"><Pencil size={20} /></div>
          <h2 id="rename-title">{locale === 'en' ? 'Rename document' : '重命名文档'}</h2>
          <label>{locale === 'en' ? 'Document name' : '文档名称'}<input autoFocus value={renameValue} onChange={event => setRenameValue(event.target.value)} onKeyDown={event => {
            if (event.key === 'Enter') void renameDocument();
          }} /></label>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setRenameTarget(undefined)}>{t(locale, 'cancel')}</button>
            <button className="primary" disabled={!renameValue.trim()} onClick={() => void renameDocument()}>{locale === 'en' ? 'Rename' : '重命名'}</button>
          </div>
        </section>
      </div>}

      {showConsent && <div className="modal-backdrop" role="presentation">
        <section className="modal" role="dialog" aria-modal="true" aria-labelledby="consent-title">
          <div className="modal-icon"><Bot size={22} /></div><h2 id="consent-title">{t(locale, 'aiTitle')}</h2>
          <div className="consent-levels">
            <label className={aiModeDraft === 'off' ? 'selected' : ''}><input type="radio" name="ai-access" value="off" checked={aiModeDraft === 'off'} onChange={() => setAiModeDraft('off')} /><span><strong>{locale === 'en' ? 'AI off' : 'AI 已关闭'}</strong><p>{locale === 'en' ? 'No API calls or provider charges.' : '不调用 API，也不产生供应商费用。'}</p></span></label>
            <label className={aiModeDraft === 'question' ? 'selected' : ''}><input type="radio" name="ai-access" value="question" checked={aiModeDraft === 'question'} onChange={() => setAiModeDraft('question')} /><span><strong>{locale === 'en' ? 'Question only' : '仅发送问题'}</strong><p>{locale === 'en' ? 'Your document stays local.' : '当前文档仍保留在本机。'}</p></span></label>
            <label className={aiModeDraft === 'document' ? 'selected' : ''}><input type="radio" name="ai-access" value="document" checked={aiModeDraft === 'document'} onChange={() => setAiModeDraft('document')} /><span><strong>{locale === 'en' ? 'Question + full document' : '问题 + 当前全文'}</strong><p>{locale === 'en' ? 'Every question also sends the current document.' : '每次提问都会同时发送当前文档。'}</p></span></label>
          </div>
          <div className="modal-actions"><button className="secondary" onClick={() => setShowConsent(false)}>{t(locale, 'cancel')}</button><button className="primary" onClick={confirmAi}>{locale === 'en' ? 'Save AI mode' : '保存 AI 模式'}</button></div>
        </section>
      </div>}

      {restoreCandidate && active && <div className="modal-backdrop" role="presentation">
        <section className="modal revision-confirm" role="dialog" aria-modal="true" aria-labelledby="restore-title">
          <div className="modal-icon"><History size={22} /></div>
          <h2 id="restore-title">{locale === 'en' ? 'Restore this version?' : '恢复这个版本？'}</h2>
          <p>{locale === 'en'
            ? 'Review what will change before replacing the current document. You can undo immediately after restoring.'
            : '请先检查将发生的变化，再替换当前文档。恢复后可以立即撤销。'}</p>
          <RevisionPreview comparison={compareRevisions(active.text, restoreCandidate.text, 'words')} locale={locale} />
          <div className="modal-actions">
            <button className="secondary" onClick={() => setRestoreCandidate(undefined)}>{t(locale, 'cancel')}</button>
            <button className="primary" onClick={restoreRevision}>{t(locale, 'restore')}</button>
          </div>
        </section>
      </div>}
    </main>
  );
}
