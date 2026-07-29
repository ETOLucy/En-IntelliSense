import { useEffect, useMemo, useRef, useState } from 'react';
import type { EditorView } from '@codemirror/view';
import {
  Bot, Check, ChevronRight, CircleAlert, FilePlus2, Files, History, Languages,
  ListTree, PanelRight, Settings2, Sparkles, Trash2, X,
} from 'lucide-react';
import type {
  AiConsent, ByokConfig, ByokProviderId, EnglishVariant, LearnerLevel, Revision, UiLocale,
  WritingDiagnostic, WritingFormat,
} from '@writemelo/contracts';
import { t } from '@writemelo/i18n';
import {
  createSpellChecker, getChecklist, getLocalDiagnostics, getOutline, getSpellingDiagnostics,
  type SpellChecker,
} from '@writemelo/writing-core';
import { db, type LocalDocument } from './db';
import { Editor } from './Editor';

const starterText = `Dear Alex,

i am writing to follow up on our meeting. I very like the direction we discussed, and I believe it will give our team more convenience.

Please reply me when you have time.

Best regards,
Melo`;

type RightTab = 'issues' | 'outline' | 'history' | 'ai';

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
    id: crypto.randomUUID(), title: 'Project follow-up', text: starterText,
    format: 'letter', level: 'natural', variant: 'en-US', updatedAt: now,
  };
}

function deriveTitle(text: string, fallback: string) {
  const line = text.split(/\r?\n/).find(value => value.trim().length > 0)?.trim();
  return line?.slice(0, 48) || fallback;
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
  const [showConsent, setShowConsent] = useState(false);
  const [spellChecker, setSpellChecker] = useState<SpellChecker>();
  const [personalWords, setPersonalWords] = useState<string[]>(() => JSON.parse(localStorage.getItem('personal-words') ?? '[]') as string[]);
  const [revisions, setRevisions] = useState<Revision[]>([]);
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
  const editorRef = useRef<EditorView | undefined>(undefined);
  const saveTimer = useRef<number | undefined>(undefined);

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
  const context = useMemo(() => active ? ({
    format: active.format, level: active.level, variant: active.variant,
    audience: '', tone: 'professional', personalWords,
  }) : undefined, [active?.format, active?.level, active?.variant, personalWords]);
  const diagnostics = useMemo(
    () => active && context ? [
      ...getLocalDiagnostics({ ...context, text: active.text, cursor: active.text.length }),
      ...(spellChecker ? getSpellingDiagnostics({ ...context, text: active.text, cursor: active.text.length }, spellChecker) : []),
    ].sort((left, right) => left.start - right.start) : [],
    [active?.text, context, spellChecker],
  );
  const outline = useMemo(
    () => active && context ? getOutline({ ...context, text: active.text, cursor: active.text.length }) : [],
    [active?.text, context],
  );
  const checklist = useMemo(
    () => active && context ? getChecklist({ ...context, text: active.text, cursor: active.text.length }) : [],
    [active?.text, context],
  );
  const wordCount = active?.text.trim() ? active.text.trim().split(/\s+/).length : 0;

  function persist(next: LocalDocument, source: Revision['source'] = 'user') {
    setDocuments(items => items.map(item => item.id === next.id ? next : item));
    setSaveState('saving');
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const revision: Revision = {
        id: crypto.randomUUID(), documentId: next.id, text: next.text, source,
        createdAt: new Date().toISOString(), summary: source === 'local-fix' ? 'Applied local correction' : 'Edited document',
      };
      void db.transaction('rw', db.documents, db.revisions, async () => {
        await db.documents.put(next);
        const latest = await db.revisions.where('documentId').equals(next.id).reverse().sortBy('createdAt');
        const previous = latest.at(-1);
        if (!previous || previous.text !== next.text) {
          await db.revisions.put(revision);
          return revision;
        }
        return undefined;
      }).then(savedRevision => {
        if (savedRevision && savedRevision.documentId === activeId) {
          setRevisions(items => [savedRevision, ...items].slice(0, 30));
        }
        setSaveState('saved');
      });
    }, 450);
  }

  function changeText(text: string) {
    if (!active) return;
    persist({ ...active, text, title: deriveTitle(text, t(locale, 'untitled')), updatedAt: new Date().toISOString() });
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

  function restoreRevision(revision: Revision) {
    if (!active) return;
    persist({ ...active, text: revision.text, title: deriveTitle(revision.text, t(locale, 'untitled')), updatedAt: new Date().toISOString() });
    editorRef.current?.focus();
  }

  async function createDocument() {
    const next = { ...makeDocument(), title: t(locale, 'untitled'), text: '' };
    await db.documents.add(next);
    setDocuments(items => [next, ...items]);
    setActiveId(next.id);
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

  function confirmAi(allowFullDocument: boolean) {
    const consent: AiConsent = {
      mode: 'manual', allowFullDocument, updatedAt: new Date().toISOString(),
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
          <div className="pane-heading"><span><Files size={16} />{t(locale, 'documents')}</span><button className="icon-button small" onClick={() => void createDocument()} title={t(locale, 'newDocument')}><FilePlus2 size={17} /></button></div>
          <nav className="document-list">
            {documents.map(item => <button key={item.id} className={item.id === active.id ? 'document-item active' : 'document-item'} onClick={() => setActiveId(item.id)}>
              <span>{item.title}</span><small>{new Date(item.updatedAt).toLocaleDateString(locale)}</small>
            </button>)}
          </nav>
        </aside>

        <section className="editor-pane">
          <div className="editor-toolbar">
            <div className="segmented">
              {(['letter', 'essay', 'message'] as WritingFormat[]).map(format =>
                <button key={format} className={active.format === format ? 'selected' : ''} onClick={() => patchActive({ format })}>{format}</button>)}
            </div>
            <span>{wordCount} {t(locale, 'words')}</span>
          </div>
          <Editor value={active.text} context={context} spellChecker={spellChecker} onChange={changeText} onReady={view => { editorRef.current = view; }} />
          <footer className="editor-footer">
            <span>{active.variant === 'en-US' ? 'English (US)' : 'English (UK)'}</span>
            <span>{diagnostics.length ? `${diagnostics.length} ${t(locale, 'issues').toLowerCase()}` : t(locale, 'noIssues')}</span>
          </footer>
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
              <button key={issue.id} className={`issue ${selectedIssue === issue.id ? 'selected' : ''}`} onClick={() => setSelectedIssue(issue.id)}>
                <span className={`severity ${issue.severity}`} /><span><strong>{issue.message}</strong><small>{issue.category}</small></span><ChevronRight size={15} />
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
              <h3>{t(locale, 'revisionHistory')}</h3>
              {revisions.length ? revisions.map(revision => <div className="revision" key={revision.id}>
                <div><strong>{revision.summary}</strong><small>{new Date(revision.createdAt).toLocaleString(locale)}</small></div>
                <button className="secondary" onClick={() => restoreRevision(revision)}>{t(locale, 'restore')}</button>
              </div>) : <div className="empty-state"><History size={24} /><p>{locale === 'en' ? 'History appears as you edit.' : '编辑后将在这里显示历史。'}</p></div>}
            </div>}
            {rightTab === 'ai' && <div className="ai-panel">
              <div className="ai-heading"><Sparkles size={22} /><div><h3>{t(locale, 'aiTitle')}</h3><p>{t(locale, 'aiDescription')}</p></div></div>
              <div className="privacy-row"><span>{aiConsent.mode === 'off' ? t(locale, 'aiOff') : 'Manual only'}</span><button className="secondary" onClick={() => setShowConsent(true)}>{aiConsent.mode === 'off' ? t(locale, 'enableAi') : t(locale, 'settings')}</button></div>
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
        <label>{t(locale, 'level')}<select value={active.level} onChange={event => patchActive({ level: event.target.value as LearnerLevel })}><option value="simple">Simple</option><option value="natural">Natural</option><option value="advanced">Advanced</option></select></label>
        <button className="danger" disabled={documents.length === 1} onClick={() => void deleteDocument()}><Trash2 size={16} />{t(locale, 'deleteDocument')}</button>
      </div>}

      {showConsent && <div className="modal-backdrop" role="presentation">
        <section className="modal" role="dialog" aria-modal="true" aria-labelledby="consent-title">
          <div className="modal-icon"><Bot size={22} /></div><h2 id="consent-title">{t(locale, 'aiTitle')}</h2>
          <p>{locale === 'en' ? 'AI is never required. When you use it, selected text is sent to the configured provider. You can change this choice at any time.' : 'AI 从不强制使用。使用时，所选文本会发送给配置的供应商；你可以随时更改选择。'}</p>
          <label className="checkbox"><input id="full-doc-consent" type="checkbox" />{t(locale, 'fullDocument')}</label>
          <div className="modal-actions"><button className="secondary" onClick={() => setShowConsent(false)}>{t(locale, 'cancel')}</button><button className="primary" onClick={() => confirmAi((document.getElementById('full-doc-consent') as HTMLInputElement).checked)}>{t(locale, 'enableAi')}</button></div>
        </section>
      </div>}
    </main>
  );
}
