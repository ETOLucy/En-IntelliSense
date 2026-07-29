# WriteMelo User Guide

## Install

Download either file from GitHub Releases:

- `WriteMelo-2.0.0-beta.1-Setup-x64.exe`: assisted Windows installer.
- `WriteMelo-2.0.0-beta.1-Portable-x64.exe`: runs without installation.

The beta is unsigned until a code-signing certificate is available, so Windows may show an unknown-publisher warning. Verify the SHA-256 value against `SHA256SUMS.txt`.

## Write

The first screen is the editor. Documents save automatically on the device.

- Choose Letter, Essay, or Message above the editor.
- Type at least two letters to open local completion suggestions.
- Use the left pane to create or switch documents.
- Use Writing settings to select US or UK English and a learning level.
- Switch the interface between English and Simplified Chinese from the header.

## Review and fix

The Issues tab lists local spelling, grammar, wording, clarity, and repetition checks. Select an issue to read the explanation and apply an exact replacement. Spelling items can also be added to the personal dictionary.

The Outline tab shows paragraph structure and a format-specific submission checklist. The History tab stores local snapshots and can restore an earlier draft.

## Optional AI

AI is off by default. Local writing tools remain available while it is off. Enabling AI requires an explicit confirmation; sending a complete document has a separate checkbox. The current beta establishes this consent boundary but does not promise a production hosted provider until regional routing, retention, account, and quota controls are configured.

## Bring your own AI provider

The Windows app can connect directly to OpenAI, Groq, Together AI, OpenRouter, Ollama, or a custom OpenAI-compatible endpoint:

1. Open **AI** in the right inspector.
2. Choose a provider and confirm its endpoint and model ID.
3. Enter an API key when the provider requires one, then choose **Save provider**.
4. Enable AI consent and ask a question. Full-document transmission remains a separate choice.

Saved keys are encrypted with Windows `safeStorage` and are not returned to the renderer. Remote providers receive approved request text and may charge under their own terms. WriteMelo does not guarantee a free provider allowance. Ollama can use its localhost endpoint without an API key.

## Remove local data

Browser users can remove the site's storage through browser settings. Windows users can uninstall WriteMelo and remove its application-data profile if they also want to erase local documents and settings. Export important writing before clearing local storage.
