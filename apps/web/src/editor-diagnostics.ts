import type { Diagnostic } from '@codemirror/lint';
import type { QuickFix, UiLocale, WritingDiagnostic } from '@writemelo/contracts';
import { diagnosticCategoryLabel } from './diagnostic-copy';

const severityMap = {
  error: 'error',
  warning: 'warning',
  suggestion: 'info',
} as const;

function actionFor(
  diagnostic: WritingDiagnostic,
  fix: QuickFix,
): NonNullable<Diagnostic['actions']>[number] {
  return {
    name: fix.title,
    apply(view, from, to) {
      if (!fix.edit) return;
      const relativeFrom = fix.edit.start - diagnostic.start;
      const relativeTo = fix.edit.end - diagnostic.end;
      const changeFrom = Math.max(0, from + relativeFrom);
      const changeTo = Math.max(changeFrom, to + relativeTo);
      view.dispatch({
        changes: { from: changeFrom, to: changeTo, insert: fix.edit.insert },
        selection: { anchor: changeFrom + fix.edit.insert.length },
        scrollIntoView: true,
      });
      view.focus();
    },
  };
}

export function toEditorDiagnostics(
  diagnostics: readonly WritingDiagnostic[],
  locale: UiLocale = 'en',
): Diagnostic[] {
  return diagnostics.map(diagnostic => {
    const actions = diagnostic.fixes
      .filter(fix => fix.edit)
      .map(fix => actionFor(diagnostic, fix));

    return {
      from: diagnostic.start,
      to: diagnostic.end,
      severity: severityMap[diagnostic.severity],
      markClass: `cm-writing-diagnostic-${diagnostic.severity}`,
      source: `WriteMelo · ${diagnosticCategoryLabel(diagnostic.category, locale)}`,
      message: `${diagnostic.message}\n${diagnostic.explanation}`,
      ...(actions.length ? { actions } : {}),
    };
  });
}
