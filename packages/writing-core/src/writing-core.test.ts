import { describe, expect, it } from 'vitest';
import type { WritingContext } from '@writemelo/contracts';
import { analyzeWriting, getLocalCompletions, getLocalDiagnostics, getSpellingCompletions, getSpellingDiagnostics } from './index';

function context(text: string, overrides: Partial<WritingContext> = {}): WritingContext {
  return {
    text,
    cursor: text.length,
    format: 'letter',
    audience: 'colleague',
    level: 'natural',
    tone: 'professional',
    variant: 'en-US',
    ...overrides,
  };
}

describe('local writing service', () => {
  it('completes proper names without boosting ordinary document words', () => {
    expect(getLocalCompletions(context('I wrote to Ayna yesterday. I should ask Ay'))[0]?.label).toBe('Ayna');
    expect(getLocalCompletions(context('This meaningful idea matters. It feels mea'))[0]?.source).toBe('dictionary');
  });

  it('provides format-aware snippets', () => {
    expect(getLocalCompletions(context('One important reason is ', { format: 'letter' }))).toHaveLength(0);
    expect(getLocalCompletions(context('One important reason is ', { format: 'essay' }))[0]?.source).toBe('snippet');
  });

  it('returns local diagnostics with exact edits', () => {
    const diagnostics = getLocalDiagnostics(context('i very like this because it is more convenience.'));
    expect(diagnostics.map(item => item.id.split(':')[0])).toEqual(['lowercase-i', 'very-like', 'more-convenience']);
    expect(diagnostics[1]?.fixes[0]?.edit?.insert).toBe('really like');
  });

  it('builds an outline and submission checklist', () => {
    const result = analyzeWriting(context('Hello there.\n\nThank you for your help.\n\nBest regards.'));
    expect(result.outline).toHaveLength(3);
    expect(result.checklist.find(item => item.id === 'letter-closing')?.passed).toBe(true);
  });

  it('does not report document names or personal dictionary words as misspellings', () => {
    const checker = {
      correct: (word: string) => word.toLowerCase() === 'met',
      suggest: () => [],
      add: () => undefined,
    };
    const diagnostics = getSpellingDiagnostics(context('I met Ayna at WriteMelo with ProTerm.', {
      personalWords: ['ProTerm'],
    }), checker);
    expect(diagnostics.map(item => item.message)).not.toContain('Check the spelling of "Ayna".');
    expect(diagnostics.map(item => item.message)).not.toContain('Check the spelling of "ProTerm".');
  });

  it('offers local spelling corrections for a mistyped current word', () => {
    const checker = {
      correct: () => false,
      suggest: (word: string) => word === 'becuase' ? ['because'] : [],
      add: () => undefined,
    };
    const completion = getSpellingCompletions(context('I stayed becuase'), checker)[0];
    expect(completion?.label).toBe('because');
    expect(completion?.source).toBe('spelling');
    expect(completion?.edit).toEqual({ start: 9, end: 16, insert: 'because' });
    expect(completion?.requiresAi).toBe(false);
  });
});
