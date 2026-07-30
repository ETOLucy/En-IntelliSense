import { describe, expect, it, vi } from 'vitest';
import type { EditorView } from '@codemirror/view';
import type { WritingDiagnostic } from '@writemelo/contracts';
import { toEditorDiagnostics } from './editor-diagnostics';

const issue: WritingDiagnostic = {
  id: 'very-like:8',
  start: 8,
  end: 17,
  severity: 'warning',
  category: 'wording',
  message: 'Use "really like" in this expression.',
  explanation: '"Really" modifies the verb "like".',
  source: 'local',
  fixes: [{
    id: 'very-like:fix:8',
    title: 'Change to "really like"',
    edit: { start: 8, end: 17, insert: 'really like' },
  }],
};

describe('toEditorDiagnostics', () => {
  it('maps WriteMelo severity and explanation to CodeMirror diagnostics', () => {
    expect(toEditorDiagnostics([issue])[0]).toMatchObject({
      from: 8,
      to: 17,
      severity: 'warning',
      markClass: 'cm-writing-diagnostic-warning',
      source: 'WriteMelo · wording',
      message: expect.stringContaining('"Really" modifies the verb "like".'),
    });
  });

  it('applies a quick fix at the diagnostic current mapped position', () => {
    const dispatch = vi.fn();
    const focus = vi.fn();
    const action = toEditorDiagnostics([issue])[0]?.actions?.[0];

    action?.apply({ dispatch, focus } as unknown as EditorView, 12, 21);

    expect(dispatch).toHaveBeenCalledWith({
      changes: { from: 12, to: 21, insert: 'really like' },
      selection: { anchor: 23 },
      scrollIntoView: true,
    });
    expect(focus).toHaveBeenCalled();
  });
});
