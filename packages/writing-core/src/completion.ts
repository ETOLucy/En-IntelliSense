import type { CompletionCandidate, WritingContext } from '@writemelo/contracts';
import { rankedWords, snippetRules } from './data';

function wordRange(context: WritingContext) {
  const before = context.text.slice(0, context.cursor);
  const match = before.match(/[A-Za-z][A-Za-z'-]*$/);
  return {
    value: match?.[0] ?? '',
    start: context.cursor - (match?.[0].length ?? 0),
    end: context.cursor,
  };
}

function documentTerms(text: string, omitStart: number) {
  const terms = new Map<string, { label: string; count: number }>();
  const pattern = /\b[A-Za-z][A-Za-z'-]{1,}\b/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text.slice(0, omitStart)))) {
    const label = match[0];
    const before = text.slice(0, match.index).trimEnd();
    const sentenceStart = !before || /[.!?\n]\s*$/.test(before);
    const acronym = /^[A-Z]{2,}$/.test(label);
    const properName = /^[A-Z][a-z]+(?:[A-Z][A-Za-z]*)?$/.test(label) && !sentenceStart;
    const productTerm = /[a-z][A-Z]|[A-Z][a-z]+[A-Z]/.test(label);
    if (!acronym && !properName && !productTerm) continue;
    const key = label.toLowerCase();
    const previous = terms.get(key);
    terms.set(key, { label: previous?.label ?? label, count: (previous?.count ?? 0) + 1 });
  }
  return terms;
}

function idFor(source: string, label: string, start: number) {
  return `${source}:${start}:${label.toLowerCase().replace(/\s+/g, '-')}`;
}

export function getLocalCompletions(context: WritingContext): CompletionCandidate[] {
  const range = wordRange(context);
  const typed = range.value.toLowerCase();
  const candidates: CompletionCandidate[] = [];

  if (typed.length >= 2) {
    for (const [, term] of documentTerms(context.text, range.start)) {
      if (!term.label.toLowerCase().startsWith(typed) || term.label.toLowerCase() === typed) continue;
      candidates.push({
        id: idFor('document', term.label, range.start),
        label: term.label,
        detail: 'Used name or term',
        kind: 'word',
        source: 'document-entity',
        confidence: 0.96,
        score: 120 + Math.min(term.count, 5) * 4,
        edit: { start: range.start, end: range.end, insert: term.label },
        requiresAi: false,
      });
    }

    const words = [...rankedWords.simple, ...rankedWords[context.level], ...(context.personalWords ?? [])];
    words.forEach((label, index) => {
      if (!label.toLowerCase().startsWith(typed) || label.toLowerCase() === typed) return;
      const history = context.acceptedHistory?.[label.toLowerCase()] ?? 0;
      candidates.push({
        id: idFor('dictionary', label, range.start),
        label,
        detail: 'Local dictionary',
        kind: 'word',
        source: history ? 'history' : 'dictionary',
        confidence: 0.9,
        score: 80 - Math.min(index, 50) + Math.min(history, 10) * 5,
        edit: { start: range.start, end: range.end, insert: label },
        requiresAi: false,
      });
    });
  }

  const before = context.text.slice(0, context.cursor);
  for (const rule of snippetRules) {
    if (!rule.formats.includes(context.format) || !rule.trigger.test(before)) continue;
    const label = rule.continuation;
    candidates.push({
      id: idFor('snippet', label, context.cursor),
      label,
      detail: rule.intent,
      kind: /[.!?]$/.test(label) ? 'sentence' : 'phrase',
      source: 'snippet',
      confidence: 1,
      score: 150,
      edit: { start: context.cursor, end: context.cursor, insert: label },
      requiresAi: false,
    });
  }

  const unique = new Map<string, CompletionCandidate>();
  for (const candidate of candidates) {
    const key = `${candidate.edit.start}:${candidate.label.toLowerCase()}`;
    const current = unique.get(key);
    if (!current || candidate.score > current.score) unique.set(key, candidate);
  }
  return [...unique.values()].sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
}

export function currentWordRange(context: WritingContext) {
  return wordRange(context);
}
