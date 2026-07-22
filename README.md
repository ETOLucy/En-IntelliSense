<div align="center">
  <img src="docs/assets/en-intellisense-logo.svg" width="140" alt="En-IntelliSense logo" />
  <h1>En-IntelliSense</h1>
  <p><strong>先理解你想表达什么，再帮你写得更自然。</strong></p>
  <p>Context-aware English completion, review, and rewriting for learners.</p>
  <p>
    <strong>English</strong>
    &nbsp;&middot;&nbsp;
    <a href="README.zh-CN.md">简体中文</a>
    &nbsp;&middot;&nbsp;
    <a href="README.es.md">Español</a>
    &nbsp;&middot;&nbsp;
    <a href="README.ja.md">日本語</a>
    &nbsp;&middot;&nbsp;
    <a href="README.ru.md">Русский</a>
  </p>
  <p>
    <a href="#demo">See it in action</a>
    &nbsp;&middot;&nbsp;
    <a href="https://github.com/ETOLucy/En-IntelliSense/releases/latest">Download Windows EXE</a>
    &nbsp;&middot;&nbsp;
    <a href="#run">Run locally</a>
    &nbsp;&middot;&nbsp;
    <a href="https://github.com/ETOLucy/En-IntelliSense">GitHub Repository</a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/completion-word%20%7C%20phrase%20%7C%20sentence-1f6f5b?style=flat-square" alt="Word, phrase, and sentence completion" />
    <img src="https://img.shields.io/badge/AI-bring%20your%20own%20model-3a7ca5?style=flat-square" alt="Bring your own model" />
    <img src="https://img.shields.io/badge/storage-local--first-3a7ca5?style=flat-square" alt="Local-first storage" />
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-c65d3b?style=flat-square" alt="MIT license" /></a>
  </p>
</div>

---

En-IntelliSense understands the intent behind the whole draft before it suggests the next word. It combines word, phrase, and sentence completion with contextual review, exact issue highlighting, bilingual explanations, and one-click repairs.

## Demo

![En-IntelliSense writing workspace](docs/assets/demo.png)

### From Chinese-style English to natural writing

The learner writes an essay using direct Chinese logic. En-IntelliSense infers the intended argument, highlights five exact source problems, explains each issue in Chinese, and provides one-click natural replacements without rewriting the learner's entire voice.

![Context-aware review correcting Chinese-style English](docs/assets/demo-chinese-logic.png)

### Finish in your webmail

For letters and emails, the finished draft carries the recipient, subject, and body into QQ Mail, 163 Mail, Gmail, or a custom webmail compose URL. QQ Mail and 163 Mail also copy the complete email automatically as a fallback if login removes compose parameters.

![Choose a webmail provider and carry over the finished email](docs/assets/demo-email.png)

## Features

- Local word completion and model-powered phrase/sentence completion.
- Whole-draft intent inference passed into subsequent completions.
- Automatic and manual writing review for grammar, clarity, wording, repetition, and tone.
- Exact issue highlighting, source location, Chinese explanation, and one-click replacement.
- Subject and selected-text polishing with three level-appropriate alternatives.
- Translation, explanation, simplification, and contextual bilingual chat.
- Useful phrases replace the selection or current sentence instead of appending duplicate text.
- Letter, essay, and message formats with local draft persistence.
- Finish a letter in QQ Mail, 163 Mail, Gmail, or a custom webmail compose URL with recipient, subject, and body carried over.
- Keep completed documents in a local Finished archive and reopen any item as an editable copy.

<a id="model-quota-and-privacy"></a>

## AI model, cost, and privacy

En-IntelliSense does not include a language model, shared API key, or free AI credit. AI completion, review, rewriting, and chat require each user to configure their own OpenAI-compatible model provider. Any fees, rate limits, retention rules, and privacy terms belong to that provider; the project does not provide or endorse unofficial relay services.

Without an API key, the app still opens and supports local word completion, drafts, finished documents, and email handoff. The coach displays `Add API key for AI`; model-powered phrase/sentence completion, review, polish, and chat remain unavailable until configuration is added.

In this architecture, multi-user isolation relies on browser-local storage rather than server-side accounts. Drafts, finished documents, and custom webmail settings are stored only in the browser's `localStorage`; the application has no server-side draft database. Visitors using different devices, browsers, or browser profiles cannot see one another's local drafts. People sharing the same browser profile also share that profile's site storage, so use separate browser profiles on a shared computer or clear the site's local data afterward.

AI-powered actions send the relevant draft text to the provider selected by the user. The application does not persist those requests, and API responses use `Cache-Control: no-store`; review the provider's privacy terms before processing confidential or sensitive writing. A desktop `.env` file is local plaintext: keep it private, never commit it, and never paste an API key into a GitHub issue.

Self-hosted Cloudflare deployments can use Workers AI and consume the deploying account's quota. That quota is not bundled with the Windows EXE and is never shared from the maintainer's personal account.

## Configure

Copy `.env.example` to `.env` and enter credentials from your own provider:

```dotenv
OPENAI_API_KEY=your_own_api_key
OPENAI_BASE_URL=https://api.openai.com
OPENAI_MODEL=gpt-4.1-mini
OPENAI_AUTOCOMPLETE_MODEL=gpt-4.1-mini
OPENAI_API_STYLE=chat
```

Use model names supported by the selected provider. `OPENAI_MODEL` handles tutoring and review; `OPENAI_AUTOCOMPLETE_MODEL` may use a faster model for inline completion. Compatible providers may use a different `OPENAI_BASE_URL`.

Never commit `.env` or place an API key in browser-side JavaScript.

## Run

Python 3.9 or newer is required.

```powershell
python -m pip install -r requirements.txt
python server.py
```

Open `http://127.0.0.1:8000`.

## Windows desktop app

For normal use, download `En-IntelliSense.exe` from the [latest GitHub release](https://github.com/ETOLucy/En-IntelliSense/releases/latest) and double-click it. No terminal, Python installation, or build command is required.

> **Signing status:** `v1.0.1` is currently unsigned and may be blocked by Windows Smart App Control. It is intended for local testing. The project has applied to SignPath Foundation; signed public releases will follow after approval.

The following command is only for developers who changed the source and need to rebuild the EXE:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build_windows.ps1
```

The result is `dist/En-IntelliSense.exe`. It bundles the local Python service and frontend, chooses an available loopback port automatically, and opens the workspace in a native WebView2 window. Python is not required on the computer running the finished EXE; Microsoft Edge WebView2 Runtime is required and is already included with current Windows 10/11 installations.

API keys and maintainer-owned model resources are never embedded in the executable. The desktop app reads model settings from user environment variables, a `.env` file beside the EXE, or `%APPDATA%\En-IntelliSense\.env` in that order. Download `En-IntelliSense.env.example`, rename it to `.env`, enter your own provider settings, and restart the app.

## Test

```powershell
python -m unittest discover -p "test_*.py"
npm test
```

## Use

- Choose Auto, Word, Phrase, or Sentence completion. Press `Tab` to accept and `Esc` to dismiss.
- Pause after typing to trigger contextual review, or press **Review**.
- Click a review item to select its exact source text, then press **Apply 修改** to replace it.
- Select text, or place the cursor in a sentence, before using Polish, Explain, or Simplify.
- Clicking a Useful phrase replaces the selection/current sentence.

## Cloudflare

The repository serves the frontend and API from one Worker. Cloudflare Workers AI is the default backend, so a free deployment works without an external API key. To use an OpenAI-compatible provider instead, add `OPENAI_API_KEY` and `OPENAI_BASE_URL` as Worker secrets.

```powershell
npx wrangler login
npx wrangler deploy

# Optional external provider
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put OPENAI_BASE_URL
```

## EdgeOne Pages

To deploy your own copy, import this GitHub repository into EdgeOne Pages, use `main` as the production branch, and leave the build command empty. The checked-in `edgeone.json` publishes `public/` and deploys the Node Functions under `node-functions/`. Those functions forward `/api/*` to the Cloudflare Worker, so no model API key is stored in EdgeOne.

## Friendly Links

- [LINUX DO - A new kind of community](https://linux.do/)

## License

[MIT](LICENSE)
