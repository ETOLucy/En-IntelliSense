# En-IntelliSense Privacy Policy

Effective date: July 29, 2026

This policy describes how the En-IntelliSense Windows application handles information. Version 1 is a local-first, bring-your-own-key application. En-IntelliSense does not provide user accounts, cloud draft storage, hosted model access, or paid subscriptions.

## Information stored on your device

En-IntelliSense stores drafts, finished documents, preferences, and model configuration in the current Windows user's local application data. The API key you enter is protected with Windows Data Protection API (DPAPI) and can be decrypted only in the corresponding Windows user context.

This locally stored information is not uploaded to an En-IntelliSense account or cloud database. Other people who can access your Windows account, device, backups, or an unlocked application session may still be able to access local content.

## AI model providers

AI completion, review, rewriting, explanation, and chat features require you to configure a compatible third-party model endpoint, API key, model ID, and API protocol.

When you use an AI feature, the application sends the relevant writing content, instructions, and necessary request metadata to the model provider you selected. En-IntelliSense does not operate an intermediary model service in version 1 and does not receive or retain these model requests on an En-IntelliSense server.

The selected provider processes information under its own privacy policy, retention rules, security practices, regional availability, and terms. Do not process confidential, regulated, or sensitive information until you have reviewed and accepted that provider's practices.

## Files and email applications

The Windows application accesses a local text or Markdown file only when you explicitly choose to open or save it. Saving a file writes content to the location you selected.

When you choose the email handoff feature, En-IntelliSense uses the standard Windows email handler to open a draft in your default email application. En-IntelliSense does not send the email. Review the recipient, subject, and body before sending it from your email application.

## Information En-IntelliSense does not collect

Version 1 does not include En-IntelliSense-operated:

- user accounts or cloud synchronization;
- advertising or cross-app tracking;
- analytics or telemetry collection;
- payment or subscription processing;
- customer draft, prompt, response, or API key databases.

The Microsoft Store, Windows, your model provider, your email application, and other services you choose may independently process diagnostic, account, billing, or usage information under their own policies.

## Retention and deletion

Local drafts and settings remain on your device until you delete them, clear the application's local data, uninstall the application and remove its retained data, or remove the corresponding Windows user profile.

Files saved outside the application data directory must be deleted separately. Information already sent to a model provider is subject to that provider's retention and deletion process.

## Security

En-IntelliSense uses local-only storage boundaries, Windows DPAPI protection for saved API keys, and loopback restrictions for its local desktop service. No method of storage or transmission is completely secure. Keep Windows updated, protect your Windows account, and do not share API keys or sensitive diagnostic logs.

Security vulnerabilities should be reported through the repository's private security advisory process described in [SECURITY.md](SECURITY.md).

## Children's privacy

En-IntelliSense is a general writing tool and is not directed specifically to children. The application does not knowingly operate a service that collects children's personal information. Parents, guardians, schools, and users must review the selected model provider's age requirements and privacy terms.

## International data transfers

Your selected model provider may process writing content in other countries or regions. The location and legal basis for that processing are controlled by the provider you configure, not by En-IntelliSense.

## Changes to this policy

This policy may change when application behavior changes. Material changes will be published in this repository with a revised effective date. The policy included with or linked from the version you use governs En-IntelliSense's behavior for that version.

## Contact

For privacy questions, use a non-public contact method listed on the [ETOLucy GitHub profile](https://github.com/ETOLucy). Do not post API keys, private writing, account identifiers, or other personal information in a public GitHub issue.

Simplified Chinese: [PRIVACY.zh-CN.md](PRIVACY.zh-CN.md)
