import { closeCompletion } from '@codemirror/autocomplete';
import { Prec, StateEffect, type EditorState } from '@codemirror/state';
import { Decoration, EditorView, keymap, ViewPlugin, WidgetType, type DecorationSet, type ViewUpdate } from '@codemirror/view';
import type { WritingContext } from '@writemelo/contracts';
import { getLocalCompletions } from '@writemelo/writing-core';

const dismissInline = StateEffect.define<string>();

class InlineWidget extends WidgetType {
  constructor(private readonly value: string) { super(); }
  eq(other: InlineWidget) { return other.value === this.value; }
  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-inline-completion';
    span.textContent = this.value;
    span.setAttribute('aria-hidden', 'true');
    return span;
  }
}

function suggestion(state: EditorState, getContext: () => Omit<WritingContext, 'text' | 'cursor'>) {
  const selection = state.selection.main;
  if (!selection.empty) return undefined;
  return getLocalCompletions({
    ...getContext(),
    text: state.doc.toString(),
    cursor: selection.head,
  }).find(item => item.source === 'snippet' && item.edit.start === selection.head);
}

function signature(state: EditorState) {
  return `${state.doc.length}:${state.selection.main.head}`;
}

export function inlineCompletionExtensions(getContext: () => Omit<WritingContext, 'text' | 'cursor'>) {
  const plugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet = Decoration.none;
    dismissed = '';

    constructor(view: EditorView) {
      this.decorations = this.compute(view);
    }

    update(update: ViewUpdate) {
      for (const transaction of update.transactions) {
        for (const effect of transaction.effects) {
          if (effect.is(dismissInline)) this.dismissed = effect.value;
        }
      }
      if (update.docChanged || update.selectionSet) this.dismissed = '';
      this.decorations = this.compute(update.view);
    }

    compute(view: EditorView) {
      if (signature(view.state) === this.dismissed) return Decoration.none;
      const item = suggestion(view.state, getContext);
      if (!item) return Decoration.none;
      return Decoration.set([
        Decoration.widget({ widget: new InlineWidget(item.label), side: 1 }).range(item.edit.start),
      ]);
    }
  }, { decorations: value => value.decorations });

  return [
    plugin,
    Prec.highest(keymap.of([
      {
        key: 'Tab',
        run(view) {
          const item = suggestion(view.state, getContext);
          if (!item) return false;
          closeCompletion(view);
          view.dispatch({
            changes: { from: item.edit.start, to: item.edit.end, insert: item.edit.insert },
            selection: { anchor: item.edit.start + item.edit.insert.length },
          });
          return true;
        },
      },
      {
        key: 'Escape',
        run(view) {
          const item = suggestion(view.state, getContext);
          if (!item) return false;
          closeCompletion(view);
          view.dispatch({ effects: dismissInline.of(signature(view.state)) });
          return true;
        },
      },
    ])),
  ];
}
