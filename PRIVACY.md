# WriteMelo Privacy Notice

Last updated: July 30, 2026

## Local processing

WriteMelo stores documents, revision snapshots, settings, consent choices, and personal dictionary entries on the device. Local completion, spelling, grammar rules, outlines, and checklists run without sending writing to WriteMelo or an AI provider.

In the browser, local data is stored in IndexedDB and local storage. In the Windows application, Electron keeps that browser profile in the current Windows user's application-data directory.

## Optional AI

AI is off by default. Enabling it requires an explicit action. Sending an entire document requires a separate checkbox. When a user invokes AI, the selected text or approved document and the minimum required writing settings may be sent to the configured service. The provider may retain or bill for requests under its own terms.

The current beta UI implements this consent boundary. A production AI provider must not be enabled until its endpoint, retention terms, regional routing, and account controls are configured and reviewed.

## Bring your own provider

In the Windows application, API keys are encrypted through Electron `safeStorage` and stored in the current Windows user's application-data directory. The renderer does not receive a saved plaintext key. Requests are sent by the Electron main process directly to the endpoint selected by the user.

Remote providers receive the text required for an approved request and may retain or charge for it under their own terms. API quotas and free allowances are not guaranteed by WriteMelo. Ollama may use an HTTP endpoint only on localhost; other provider endpoints must use HTTPS.

## Accounts and diagnostics

Local writing features do not require an account. Hosted account and support services may process email addresses, authentication events, quota usage, purchase records, and support messages when those services are enabled. Production secrets, provider pools, abuse thresholds, user writing, and logs are not stored in this public repository.

## Contact

Report privacy or security issues through the repository's private security reporting channel.
