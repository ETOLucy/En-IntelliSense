import nspell, { type NSpell } from 'nspell';
import type { CompletionCandidate, WritingContext, WritingDiagnostic } from '@writemelo/contracts';
import { currentWordRange } from './completion';

const ignoredWords = new Set(['writemelo']);

export interface SpellChecker {
  correct(word: string): boolean;
  suggest(word: string): string[];
  add(word: string): void;
}

export function createSpellChecker(aff: string, dic: string, personalWords: readonly string[] = []): SpellChecker {
  const checker: NSpell = nspell(aff, dic);
  for (const word of personalWords) checker.add(word);
  return checker;
}

export function getSpellingDiagnostics(context: WritingContext, checker: SpellChecker): WritingDiagnostic[] {
  const diagnostics: WritingDiagnostic[] = [];
  const documentEntities = new Set(
    [...context.text.matchAll(/\b(?:[A-Z]{2,}|[A-Z][a-z]+(?:[A-Z][A-Za-z]*)?)\b/g)]
      .map(match => match[0].toLowerCase()),
  );
  const pattern = /\b[A-Za-z][A-Za-z'-]{2,}\b/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(context.text))) {
    const word = match[0];
    if (
      ignoredWords.has(word.toLowerCase())
      || documentEntities.has(word.toLowerCase())
      || context.personalWords?.some(item => item.toLowerCase() === word.toLowerCase())
      || checker.correct(word)
    ) continue;

    const suggestions = checker.suggest(word).slice(0, 3);
    const start = match.index;
    const end = start + word.length;
    diagnostics.push({
      id: `spelling:${start}:${word.toLowerCase()}`,
      start,
      end,
      severity: 'error',
      category: 'spelling',
      message: `Check the spelling of "${word}".`,
      explanation: suggestions.length ? `Possible spelling: ${suggestions.join(', ')}` : 'This word is not in the local dictionary.',
      fixes: [
        ...suggestions.map((suggestion, index) => ({
          id: `spelling:${start}:fix:${index}`,
          title: `Change to "${suggestion}"`,
          edit: { start, end, insert: suggestion },
        })),
        {
          id: `spelling:${start}:dictionary`,
          title: 'Add to personal dictionary',
          action: 'add-to-dictionary' as const,
        },
      ],
      source: 'local',
    });
  }
  return diagnostics;
}

export function getSpellingCompletions(context: WritingContext, checker: SpellChecker): CompletionCandidate[] {
  const range = currentWordRange(context);
  const word = range.value;
  if (
    word.length < 3
    || checker.correct(word)
    || context.personalWords?.some(item => item.toLowerCase() === word.toLowerCase())
    || /^[A-Z][a-z]+$/.test(word)
  ) return [];

  return checker.suggest(word).slice(0, 4).map((suggestion, index) => ({
    id: `spelling-completion:${range.start}:${suggestion.toLowerCase()}`,
    label: suggestion,
    detail: 'Correct local spelling',
    kind: 'correction',
    source: 'spelling',
    confidence: Math.max(0.7, 0.95 - index * 0.05),
    score: 140 - index,
    edit: { start: range.start, end: range.end, insert: suggestion },
    requiresAi: false,
  }));
}
