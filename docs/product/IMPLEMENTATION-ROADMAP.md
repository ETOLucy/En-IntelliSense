# Implementation Roadmap

## 2.0 beta: local writing workbench

- CodeMirror workbench, bilingual UI, local documents, and responsive inspector.
- Local completion for vocabulary, snippets, proper names, acronyms, and product terms.
- Offline spelling, deterministic diagnostics, quick fixes, outline, checklist, revisions, and personal dictionary.
- Inline lint marks, hover explanations, gutter markers, Quick Fix, and Problems-to-editor navigation.
- Word-level revision diff, preview, restore confirmation, undo, snapshot dedupe, and retention.
- Renameable documents; real `.txt`, `.text`, `.md`, and `.markdown` open/save; `.txt` and Hunspell `.dic` dictionary import.
- Typo-tolerant candidates and fixed-expression inline continuation with Tab/Escape.
- Explicit three-mode optional-AI consent boundary.
- Secure Electron shell, Windows installer, portable build, and automated tests.

## 2.1: learning intelligence

- Local collocation index and level-aware vocabulary ranking.
- Grow the active completion vocabulary beyond the current 61 ranked words and 7 fixed snippets.
- Build a genuine local usage-history feedback loop for completion ranking.
- Expand terminology-consistency and grammar coverage with measured precision and regression tests.
- User-authored reusable snippets and additional explicitly supported file formats.
- Accessibility and keyboard-command audit.

## 2.2: hosted beta

- Migrate authentication and sessions to TypeScript.
- Unified quota ledger with reservation and release.
- Regional provider pools, failover, and cost controls.
- Small free hosted-AI trial, with transparent units and no assumed provider freebies.

## Later surfaces

Chrome, Google Docs, and Word integrations reuse contracts and writing-core. They are separate delivery surfaces, not reasons to couple the core to Electron or React.
