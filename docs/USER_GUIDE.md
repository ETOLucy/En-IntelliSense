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
- Rename the active document from its title control.
- Use **Open**, **Save**, or **Save as** for `.txt`, `.text`, `.md`, and `.markdown`. `Ctrl+S` saves an opened file back to its authorized path.
- Use Writing settings to select US or UK English and a learning level.
- Switch the interface between English and Simplified Chinese from the header.

## Review and fix

Issues also appear directly in the editor as error, warning, or suggestion marks. Hover a mark for its reason and available Quick Fix. Selecting an item in **Problems** focuses and selects the same text; applying a fix immediately recomputes the list. The gutter indicates lines that contain issues.

Spelling uses a built-in 49,568-entry English word list. Add individual words from a spelling issue, or import a `.txt` file with one word per line or a Hunspell `.dic` file from Settings. Imported words are deduplicated locally and are limited to 50,000.

The Outline tab shows paragraph structure and a format-specific submission checklist. The History tab compares a snapshot with the current text using a word-level diff and change counts. Review the preview before confirming a restore; the restore can then be undone. Snapshots are deduplicated, written no more than once per 30 seconds during editing, and limited to the newest 100 per document.

## Optional AI

AI is off by default. Choose one of three modes: **Off**, **Question only**, or **Question + full document**. Changing a mode sends nothing; a provider is contacted only after a question is submitted. The browser preview does not include a configured hosted provider. The Windows app supports user-configured providers.

## Bring your own AI provider

The Windows app can connect directly to OpenAI, Groq, Together AI, OpenRouter, Ollama, or a custom OpenAI-compatible endpoint:

1. Open **AI** in the right inspector.
2. Choose a provider and confirm its endpoint and model ID.
3. Enter an API key when the provider requires one, then choose **Save provider**.
4. Choose question-only or question-plus-document mode, then ask a question.

Saved keys are encrypted with Windows `safeStorage` and are not returned to the renderer. Remote providers receive approved request text and may charge under their own terms. WriteMelo does not guarantee a free provider allowance. Ollama can use its localhost endpoint without an API key.

## Remove local data

Browser users can remove the site's storage through browser settings. Windows users can uninstall WriteMelo and remove its application-data profile if they also want to erase local documents and settings. Export important writing before clearing local storage.
