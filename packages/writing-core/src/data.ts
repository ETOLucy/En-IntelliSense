import type { LearnerLevel, WritingFormat } from '@writemelo/contracts';

export const rankedWords: Record<LearnerLevel, readonly string[]> = {
  simple: [
    'about', 'after', 'again', 'always', 'because', 'better', 'enjoy', 'friend', 'happy',
    'hello', 'help', 'hope', 'important', 'learn', 'need', 'people', 'school', 'thank',
    'together', 'understand', 'want', 'well', 'world', 'write',
  ],
  natural: [
    'appreciate', 'atmosphere', 'certainly', 'consider', 'delighted', 'especially',
    'experience', 'familiar', 'fortunately', 'genuine', 'immediately', 'meaningful',
    'naturally', 'opportunity', 'perspective', 'probably', 'recommend', 'surprisingly',
    'thoughtful', 'wonderful',
  ],
  advanced: [
    'acknowledge', 'admittedly', 'compelling', 'consequently', 'considerable',
    'distinctive', 'eloquently', 'fundamentally', 'furthermore', 'inevitably',
    'insightful', 'nevertheless', 'profoundly', 'remarkably', 'significant',
    'subsequently', 'ultimately',
  ],
};

export interface SnippetRule {
  trigger: RegExp;
  label: string;
  continuation: string;
  formats: readonly WritingFormat[];
  intent: string;
}

export const snippetRules: readonly SnippetRule[] = [
  {
    trigger: /I would love to\s*$/i,
    label: "hear how you've been lately.",
    continuation: "hear how you've been lately.",
    formats: ['letter', 'message'],
    intent: 'Warm follow-up',
  },
  {
    trigger: /I hope\s*$/i,
    label: 'you have been doing well.',
    continuation: 'you have been doing well.',
    formats: ['letter', 'message'],
    intent: 'Friendly opening',
  },
  {
    trigger: /Thank you for\s*$/i,
    label: 'taking the time to reply.',
    continuation: 'taking the time to reply.',
    formats: ['letter'],
    intent: 'Thank the reader',
  },
  {
    trigger: /Could you please\s*$/i,
    label: 'let me know when you have a moment?',
    continuation: 'let me know when you have a moment?',
    formats: ['letter', 'message'],
    intent: 'Polite request',
  },
  {
    trigger: /One important reason is\s*$/i,
    label: 'that it helps people understand each other.',
    continuation: 'that it helps people understand each other.',
    formats: ['essay'],
    intent: 'Develop a reason',
  },
  {
    trigger: /For example,\s*$/i,
    label: 'this can be seen in everyday communication.',
    continuation: 'this can be seen in everyday communication.',
    formats: ['essay'],
    intent: 'Add an example',
  },
  {
    trigger: /In conclusion, I believe that\s*$/i,
    label: 'this can make a meaningful difference.',
    continuation: 'this can make a meaningful difference.',
    formats: ['essay'],
    intent: 'Conclude an argument',
  },
];
