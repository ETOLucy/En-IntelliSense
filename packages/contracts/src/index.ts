export type UiLocale = 'zh-CN' | 'en';
export type EnglishVariant = 'en-US' | 'en-GB';
export type WritingFormat = 'letter' | 'essay' | 'message';
export type LearnerLevel = 'simple' | 'natural' | 'advanced';
export type CompletionKind = 'word' | 'phrase' | 'sentence' | 'correction';
export type DiagnosticSeverity = 'error' | 'warning' | 'suggestion';
export type DiagnosticCategory =
  | 'spelling'
  | 'grammar'
  | 'clarity'
  | 'wording'
  | 'repetition'
  | 'tone'
  | 'consistency';

export interface TextRange {
  start: number;
  end: number;
}

export interface TextEdit extends TextRange {
  insert: string;
}

export interface WritingContext {
  text: string;
  cursor: number;
  selection?: TextRange;
  format: WritingFormat;
  audience: string;
  level: LearnerLevel;
  tone: string;
  variant: EnglishVariant;
  personalWords?: readonly string[];
  acceptedHistory?: Readonly<Record<string, number>>;
}

export interface CompletionCandidate {
  id: string;
  label: string;
  detail: string;
  kind: CompletionKind;
  source: 'dictionary' | 'document-entity' | 'spelling' | 'collocation' | 'snippet' | 'history' | 'ai';
  confidence: number;
  score: number;
  edit: TextEdit;
  requiresAi: boolean;
}

export interface QuickFix {
  id: string;
  title: string;
  edit?: TextEdit;
  action?: 'ignore' | 'add-to-dictionary' | 'explain-with-ai';
}

export interface WritingDiagnostic extends TextRange {
  id: string;
  severity: DiagnosticSeverity;
  category: DiagnosticCategory;
  message: string;
  explanation: string;
  fixes: QuickFix[];
  source: 'local' | 'ai';
}

export interface OutlineItem extends TextRange {
  id: string;
  label: string;
  note: string;
  level: 1 | 2;
}

export interface WritingAnalysis {
  completions: CompletionCandidate[];
  diagnostics: WritingDiagnostic[];
  outline: OutlineItem[];
  checklist: Array<{ id: string; label: string; passed: boolean }>;
}

export interface AiConsent {
  mode: 'off' | 'ask' | 'manual' | 'automatic';
  allowFullDocument: boolean;
  providerId?: string;
  updatedAt: string;
}

export interface Revision {
  id: string;
  documentId: string;
  text: string;
  source: 'user' | 'local-fix' | 'ai' | 'restore';
  createdAt: string;
  summary: string;
}

export type ByokProviderId = 'openai' | 'groq' | 'together' | 'openrouter' | 'ollama' | 'custom';

export interface ByokConfig {
  providerId: ByokProviderId;
  baseUrl: string;
  model: string;
  hasApiKey: boolean;
}

export interface ByokConfigInput extends Omit<ByokConfig, 'hasApiKey'> {
  apiKey?: string;
}

export interface ByokChatRequest {
  message: string;
  context: string;
  language: 'English' | 'Simplified Chinese';
}

export interface ByokChatResult {
  reply: string;
}

export type SupportedTextFileExtension = '.txt' | '.text' | '.md' | '.markdown';

export interface OpenedTextFile {
  name: string;
  reference: string;
  content: string;
}

export interface SaveTextFileInput {
  reference?: string;
  suggestedName: string;
  content: string;
  saveAs: boolean;
}

export interface SavedTextFile {
  name: string;
  reference: string;
}

export interface OpenedDictionaryFile {
  name: string;
  content: string;
}
