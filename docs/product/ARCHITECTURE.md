# WriteMelo Architecture

WriteMelo is a modular monolith with a local-first writing core. The browser and Windows app share the same React UI and pure TypeScript analysis packages; Cloudflare Workers host only features that require a network boundary.

## Runtime map

```text
keyboard / document event
          |
          v
React + CodeMirror (apps/web)
          |
          +--> WritingContext --> packages/writing-core
          |                         | completion candidates
          |                         | diagnostics + exact edits
          |                         | outline + checklist
          |                         v
          |                    rendered locally
          |
          +--> Dexie / IndexedDB --> documents, revisions
          |
          +--> explicit AI consent --> Hono API --> provider router

Electron (apps/desktop) loads the built web application with Node integration
disabled, context isolation enabled, sandbox enabled, and navigation restricted.
```

## Module boundaries

- `packages/contracts`: data exchanged between UI, local analysis, and HTTP services.
- `packages/writing-core`: deterministic writing logic. It cannot import UI, database, cloud, or provider code.
- `packages/i18n`: the supported public UI locales, English and Simplified Chinese.
- `apps/web`: editor state, rendering, consent UX, and device persistence.
- `apps/desktop`: delivery and operating-system security boundary only.
- `apps/worker`: Hono routing, middleware, dependency assembly, and compatibility dispatch.
- `src/cloud` and `worker.js`: tested legacy account, quota, support, and provider behavior. This boundary shrinks module by module.

## Data and privacy rules

Local analysis receives document text in memory and returns structured results. Documents, personal words, and revisions remain on the device. AI is not a fallback for local analysis and cannot be called while consent mode is `off`. Full-document transmission additionally requires `allowFullDocument`.

Production secrets, provider pools, fraud thresholds, user content, and certificates are runtime configuration and must never enter the repository.

## Backend migration order

1. Authentication and sessions.
2. Unified usage ledger using reserve, provider call, then commit or release.
3. Provider selection and failover.
4. Store verification, payments, and referrals.
5. Support and risk controls.
6. Remove the legacy adapter only after parity tests pass.

This sequence keeps the deployed system usable while avoiding a risky all-at-once rewrite.
