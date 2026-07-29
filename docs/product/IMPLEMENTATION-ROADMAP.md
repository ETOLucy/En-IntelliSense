# Implementation Roadmap

## 2.0 beta: local writing workbench

- CodeMirror workbench, bilingual UI, local documents, and responsive inspector.
- Local completion for vocabulary, snippets, proper names, acronyms, and product terms.
- Offline spelling, deterministic diagnostics, quick fixes, outline, checklist, revisions, and personal dictionary.
- Explicit optional-AI and full-document consent boundary.
- Secure Electron shell, Windows installer, portable build, and automated tests.

## 2.1: learning intelligence

- Local collocation index and level-aware vocabulary ranking.
- Typo-tolerant completion that preserves exact replacement ranges.
- Inline phrase continuation with Tab to accept and Escape to dismiss.
- Revision diff view, reusable snippets, and import/export.
- Accessibility and keyboard-command audit.

## 2.2: hosted beta

- Migrate authentication and sessions to TypeScript.
- Unified quota ledger with reservation and release.
- Regional provider pools, failover, and cost controls.
- Small free hosted-AI trial, with transparent units and no assumed provider freebies.

## Later surfaces

Chrome, Google Docs, and Word integrations reuse contracts and writing-core. They are separate delivery surfaces, not reasons to couple the core to Electron or React.
