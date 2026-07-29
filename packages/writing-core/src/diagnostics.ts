import type { QuickFix, WritingContext, WritingDiagnostic } from '@writemelo/contracts';

interface Rule {
  id: string;
  pattern: RegExp;
  message: string;
  explanation: string;
  replacement: (match: string) => string;
  category: WritingDiagnostic['category'];
  severity: WritingDiagnostic['severity'];
}

const rules: readonly Rule[] = [
  {
    id: 'lowercase-i',
    pattern: /\bi\b/g,
    message: 'The pronoun "I" is always capitalized.',
    explanation: 'Use a capital I when referring to yourself.',
    replacement: () => 'I',
    category: 'grammar',
    severity: 'error',
  },
  {
    id: 'very-like',
    pattern: /\bvery like\b/gi,
    message: 'Use "really like" in this expression.',
    explanation: '"Really" modifies the verb "like". "Very" usually modifies adjectives and adverbs.',
    replacement: match => (/^[A-Z]/.test(match) ? 'Really like' : 'really like'),
    category: 'wording',
    severity: 'warning',
  },
  {
    id: 'reply-me',
    pattern: /\breply me\b/gi,
    message: 'Use "reply to me".',
    explanation: 'The verb "reply" takes "to" before the person receiving the reply.',
    replacement: () => 'reply to me',
    category: 'grammar',
    severity: 'error',
  },
  {
    id: 'more-convenience',
    pattern: /\bmore convenience\b/gi,
    message: 'Use the adjective "more convenient".',
    explanation: 'This sentence needs the adjective "convenient", not the noun "convenience".',
    replacement: () => 'more convenient',
    category: 'grammar',
    severity: 'error',
  },
  {
    id: 'double-space',
    pattern: / {2,}/g,
    message: 'Remove the extra space.',
    explanation: 'Use one space between words.',
    replacement: () => ' ',
    category: 'clarity',
    severity: 'suggestion',
  },
];

function makeFix(rule: Rule, start: number, end: number, match: string): QuickFix {
  const replacement = rule.replacement(match);
  return {
    id: `${rule.id}:fix:${start}`,
    title: `Change to "${replacement}"`,
    edit: { start, end, insert: replacement },
  };
}

function repeatedWordDiagnostics(text: string): WritingDiagnostic[] {
  const diagnostics: WritingDiagnostic[] = [];
  const pattern = /\b([A-Za-z]{4,})\b(?:\s+\1\b)+/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    const start = match.index;
    const end = start + match[0].length;
    const word = match[1] ?? '';
    diagnostics.push({
      id: `repeated-word:${start}`,
      start,
      end,
      severity: 'warning',
      category: 'repetition',
      message: `"${word}" is repeated.`,
      explanation: 'Repeated adjacent words are usually accidental.',
      fixes: [{
        id: `repeated-word:fix:${start}`,
        title: 'Remove the repetition',
        edit: { start, end, insert: word },
      }],
      source: 'local',
    });
  }
  return diagnostics;
}

export function getLocalDiagnostics(context: WritingContext): WritingDiagnostic[] {
  const diagnostics: WritingDiagnostic[] = [];
  for (const rule of rules) {
    rule.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = rule.pattern.exec(context.text))) {
      const start = match.index;
      const end = start + match[0].length;
      diagnostics.push({
        id: `${rule.id}:${start}`,
        start,
        end,
        severity: rule.severity,
        category: rule.category,
        message: rule.message,
        explanation: rule.explanation,
        fixes: [makeFix(rule, start, end, match[0])],
        source: 'local',
      });
      if (match[0].length === 0) rule.pattern.lastIndex += 1;
    }
  }
  return [...diagnostics, ...repeatedWordDiagnostics(context.text)]
    .sort((a, b) => a.start - b.start || a.end - b.end);
}
