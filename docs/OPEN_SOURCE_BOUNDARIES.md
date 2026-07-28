# Open-source and private-data boundaries

En-IntelliSense can publish its application, Worker, admin-console, schema, and risk-control source code. Security must not depend on hiding source code. Authentication, authorization, server-side Store verification, rate limits, least-privilege access, secret rotation, and audit trails protect production.

The following must never be committed to this public repository:

- User drafts, prompts, responses, email addresses, support conversations, account identifiers, device identifiers, or IP addresses.
- D1/SQLite database files, database exports, backups, audit exports, analytics exports, or raw logs.
- Microsoft Store receipts, entitlement payloads, refund records, or customer transaction exports.
- Real `.env`, `.dev.vars`, `store/partner-center.json`, production Wrangler configuration, API keys, signing keys, admin secrets, Azure credentials, certificates, or certificate passwords.
- `%APPDATA%\En-IntelliSense\config.json` or any DPAPI-protected user configuration copied from a machine.

Safe to publish:

- Database migrations containing schema only.
- Example configuration using `example.com`, `EXAMPLE_*`, and clearly fake identifiers.
- Tests using fake keys such as `test-key`.
- Plan limits, request weights, validation logic, and security design.

Production resources remain outside Git:

```text
Microsoft Partner Center       real products, pricing, submissions
Cloudflare Secrets             model key, signing keys, admin secret
Cloudflare D1                  subscriptions, entitlements, audit records
Cloudflare Access              administrator identities and MFA policy
Windows DPAPI                  each user's locally saved API key/token
```

Before every commit or push:

```powershell
npm run privacy
```

The scanner checks tracked and untracked publishable files without printing secret values. It rejects known private endpoints, common API-key formats, private keys, local proxy ports, Windows user paths, certificate files, and sensitive local configuration.

If a real secret is ever committed, deleting it from the latest file is insufficient. Revoke and rotate it immediately, then clean Git history before pushing or publishing a release.
