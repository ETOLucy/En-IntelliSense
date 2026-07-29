import { useEffect, useRef } from 'react';
import { acceptCompletion, autocompletion, closeCompletion, type CompletionContext } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { EditorState } from '@codemirror/state';
import { keymap, EditorView, placeholder } from '@codemirror/view';
import type { WritingContext } from '@writemelo/contracts';
import { getLocalCompletions, getSpellingCompletions, type SpellChecker } from '@writemelo/writing-core';
import { inlineCompletionExtensions } from './inline-completion';

interface EditorProps {
  value: string;
  context: Omit<WritingContext, 'text' | 'cursor'>;
  onChange: (value: string) => void;
  onReady: (view: EditorView) => void;
  spellChecker?: SpellChecker | undefined;
}

export function Editor({ value, context, onChange, onReady, spellChecker }: EditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | undefined>(undefined);
  const contextRef = useRef(context);
  const spellCheckerRef = useRef(spellChecker);
  contextRef.current = context;
  spellCheckerRef.current = spellChecker;

  useEffect(() => {
    if (!host.current) return;
    const completionSource = (completionContext: CompletionContext) => {
      const view = completionContext.state;
      const cursor = completionContext.pos;
      const writingContext = {
        ...contextRef.current,
        text: view.doc.toString(),
        cursor,
      };
      const results = [
        ...getLocalCompletions(writingContext),
        ...(spellCheckerRef.current ? getSpellingCompletions(writingContext, spellCheckerRef.current) : []),
      ].sort((left, right) => right.score - left.score);
      if (!results.length) return null;
      return {
        from: results[0]?.edit.start ?? cursor,
        options: results.map(item => ({
          label: item.label,
          detail: item.detail,
          type: item.kind === 'word' ? 'text' : 'keyword',
          boost: item.score,
          apply: item.label,
        })),
      };
    };
    const view = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          history(),
          inlineCompletionExtensions(() => contextRef.current),
          keymap.of([
            { key: 'Tab', run: acceptCompletion },
            { key: 'Escape', run: closeCompletion },
          ]),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          autocompletion({ override: [completionSource], activateOnTyping: true }),
          placeholder('Start writing in English...'),
          EditorView.lineWrapping,
          EditorView.updateListener.of(update => {
            if (update.docChanged) onChange(update.state.doc.toString());
          }),
        ],
      }),
    });
    viewRef.current = view;
    onReady(view);
    return () => view.destroy();
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === value) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
  }, [value]);

  return <div className="editor-host" ref={host} aria-label="English writing editor" />;
}
