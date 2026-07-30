import { describe, expect, it } from 'vitest';
import type { WritingDiagnostic } from '@writemelo/contracts';
import { diagnosticCategoryLabel, localizeDiagnostic, revisionSummaryLabel } from './diagnostic-copy';

const issue: WritingDiagnostic = {
  id: 'modal-of:2',
  start: 2,
  end: 10,
  severity: 'error',
  category: 'grammar',
  message: 'Use "have" after this modal verb.',
  explanation: 'Use "could have", not "of".',
  source: 'local',
  fixes: [{ id: 'fix', title: 'Change', edit: { start: 2, end: 10, insert: 'could have' } }],
};

describe('localized diagnostic copy', () => {
  it('translates copy without changing ranges or edits', () => {
    const translated = localizeDiagnostic(issue, 'zh-CN');
    expect(translated.message).toBe('情态动词后应使用“have”。');
    expect(translated.fixes[0]?.edit).toEqual(issue.fixes[0]?.edit);
    expect(translated.fixes[0]?.title).toBe('改为“could have”');
  });

  it('translates categories and stored revision summaries', () => {
    expect(diagnosticCategoryLabel('grammar', 'zh-CN')).toBe('语法');
    expect(revisionSummaryLabel('2 modified, 1 added', 'zh-CN')).toBe('2 处修改，1 处新增');
  });
});
