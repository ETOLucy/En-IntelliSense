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
  {
    id: 'alot',
    pattern: /\balot\b/gi,
    message: 'Write "a lot" as two words.',
    explanation: '"A lot" is always written as two separate words.',
    replacement: match => (/^[A-Z]/.test(match) ? 'A lot' : 'a lot'),
    category: 'spelling',
    severity: 'error',
  },
  {
    id: 'modal-of',
    pattern: /\b(?:could|should|would) of\b/gi,
    message: 'Use "have" after this modal verb.',
    explanation: 'Use "could have", "should have", or "would have", not "of".',
    replacement: match => match.replace(/of$/i, 'have'),
    category: 'grammar',
    severity: 'error',
  },
  {
    id: 'discuss-about',
    pattern: /\bdiscuss about\b/gi,
    message: 'Use "discuss" without "about".',
    explanation: '"Discuss" takes a direct object: discuss the plan.',
    replacement: match => match.replace(/\s+about$/i, ''),
    category: 'grammar',
    severity: 'warning',
  },
  {
    id: 'informations',
    pattern: /\binformations\b/gi,
    message: '"Information" is uncountable.',
    explanation: 'Use "information" or "pieces of information".',
    replacement: match => (/^[A-Z]/.test(match) ? 'Information' : 'information'),
    category: 'grammar',
    severity: 'error',
  },
  {
    id: 'depend-of',
    pattern: /\bdepends? of\b/gi,
    message: 'Use "depend on".',
    explanation: 'The verb "depend" normally takes the preposition "on".',
    replacement: match => match.replace(/of$/i, 'on'),
    category: 'grammar',
    severity: 'error',
  },
  {
    id: 'space-before-punctuation',
    pattern: / +(?=[,.;:!?])/g,
    message: 'Remove the space before punctuation.',
    explanation: 'English punctuation normally follows the preceding word without a space.',
    replacement: () => '',
    category: 'clarity',
    severity: 'suggestion',
  },
  {
    id: 'repeated-punctuation',
    pattern: /([!?])\1+/g,
    message: 'Use a single punctuation mark.',
    explanation: 'Repeated exclamation or question marks are usually too informal for polished writing.',
    replacement: match => match[0] ?? '',
    category: 'tone',
    severity: 'warning',
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
