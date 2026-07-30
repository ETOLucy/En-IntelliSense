import type {
  DiagnosticCategory,
  LearnerLevel,
  UiLocale,
  WritingDiagnostic,
  WritingFormat,
} from '@writemelo/contracts';

const chineseRules: Record<string, { message: string; explanation: string }> = {
  'lowercase-i': { message: '代词“I”必须大写。', explanation: '表示自己时，应始终使用大写的“I”。' },
  'very-like': { message: '这里应使用“really like”。', explanation: '“Really”可以修饰动词“like”；“very”通常修饰形容词或副词。' },
  'reply-me': { message: '这里应使用“reply to me”。', explanation: '“Reply”指明回复对象时需要搭配介词“to”。' },
  'more-convenience': { message: '这里应使用形容词“more convenient”。', explanation: '句子需要形容词“convenient”，而不是名词“convenience”。' },
  'double-space': { message: '删除多余空格。', explanation: '英文单词之间通常只保留一个空格。' },
  alot: { message: '“a lot”应分成两个词。', explanation: '规范写法始终是分开的“a lot”。' },
  'modal-of': { message: '情态动词后应使用“have”。', explanation: '应写成“could have”“should have”或“would have”，而不是“of”。' },
  'discuss-about': { message: '“discuss”后不需要“about”。', explanation: '“Discuss”直接接宾语，例如“discuss the plan”。' },
  informations: { message: '“information”是不可数名词。', explanation: '使用“information”或“pieces of information”。' },
  'depend-of': { message: '这里应使用“depend on”。', explanation: '动词“depend”通常与介词“on”搭配。' },
  'space-before-punctuation': { message: '删除标点前的空格。', explanation: '英文标点通常紧跟在前一个词之后。' },
  'repeated-punctuation': { message: '只保留一个标点符号。', explanation: '连续的问号或感叹号通常不适合正式写作。' },
};

const chineseCategories: Record<DiagnosticCategory, string> = {
  spelling: '拼写',
  grammar: '语法',
  clarity: '清晰度',
  wording: '措辞',
  repetition: '重复',
  tone: '语气',
  consistency: '一致性',
};

export function localizeDiagnostic(
  diagnostic: WritingDiagnostic,
  locale: UiLocale,
): WritingDiagnostic {
  if (locale === 'en') return diagnostic;
  const ruleId = diagnostic.id.split(':')[0] ?? diagnostic.id;
  let copy = chineseRules[ruleId];
  if (ruleId === 'spelling') {
    const word = diagnostic.message.match(/"([^"]+)"/)?.[1] ?? '';
    copy = {
      message: `请检查“${word}”的拼写。`,
      explanation: diagnostic.explanation.startsWith('Possible spelling:')
        ? `可能的拼写：${diagnostic.explanation.slice('Possible spelling:'.length).trim()}`
        : '本地词典中没有这个词。',
    };
  } else if (ruleId === 'repeated-word') {
    const word = diagnostic.message.match(/"([^"]+)"/)?.[1] ?? '';
    copy = { message: `“${word}”重复出现。`, explanation: '相邻的重复单词通常是误输入。' };
  }
  if (!copy) return diagnostic;

  return {
    ...diagnostic,
    message: copy.message,
    explanation: copy.explanation,
    fixes: diagnostic.fixes.map(fix => ({
      ...fix,
      title: fix.edit
        ? fix.edit.insert ? `改为“${fix.edit.insert}”` : '删除多余内容'
        : fix.action === 'add-to-dictionary' ? '加入个人词典' : fix.title,
    })),
  };
}

export function diagnosticCategoryLabel(category: DiagnosticCategory, locale: UiLocale) {
  return locale === 'en' ? category : chineseCategories[category];
}

export function formatLabel(format: WritingFormat, locale: UiLocale) {
  if (locale === 'en') return format;
  return { letter: '信件', essay: '文章', message: '消息' }[format];
}

export function levelLabel(level: LearnerLevel, locale: UiLocale) {
  if (locale === 'en') return level[0]?.toUpperCase() + level.slice(1);
  return { simple: '基础', natural: '自然', advanced: '进阶' }[level];
}

export function revisionSummaryLabel(summary: string, locale: UiLocale) {
  if (locale === 'en') return summary;
  if (summary === 'Initial version') return '初始版本';
  if (summary === 'No text changes') return '正文没有变化';
  return summary
    .replace(/(\d+) modified/g, '$1 处修改')
    .replace(/(\d+) added/g, '$1 处新增')
    .replace(/(\d+) removed/g, '$1 处删除')
    .replace(/, /g, '，');
}
