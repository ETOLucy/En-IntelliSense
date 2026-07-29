export { getLocalCompletions, currentWordRange } from './completion';
export { getLocalDiagnostics } from './diagnostics';
export { createSpellChecker, getSpellingCompletions, getSpellingDiagnostics } from './spelling';
export type { SpellChecker } from './spelling';
export { getChecklist, getOutline } from './structure';

import type { WritingAnalysis, WritingContext, WritingDiagnostic } from '@writemelo/contracts';
import { getLocalCompletions } from './completion';
import { getLocalDiagnostics } from './diagnostics';
import type { SpellChecker } from './spelling';
import { getSpellingDiagnostics } from './spelling';
import { getChecklist, getOutline } from './structure';

export function analyzeWriting(context: WritingContext, spellChecker?: SpellChecker): WritingAnalysis {
  const diagnostics: WritingDiagnostic[] = [
    ...getLocalDiagnostics(context),
    ...(spellChecker ? getSpellingDiagnostics(context, spellChecker) : []),
  ].sort((a, b) => a.start - b.start || a.end - b.end);

  return {
    completions: getLocalCompletions(context),
    diagnostics,
    outline: getOutline(context),
    checklist: getChecklist(context),
  };
}
