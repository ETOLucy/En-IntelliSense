# En-IntelliSense

Context-aware English writing assistance for learners. En-IntelliSense infers the writer's intent from the whole draft, provides word/phrase/sentence completion, reviews problems in context, highlights exact source text, and offers one-click repairs with bilingual explanations.

Live demo: [en-intellisense-85d4szue.edgeone.cool](https://en-intellisense-85d4szue.edgeone.cool/)

Docs: **English** | [简体中文](README.zh-CN.md) | [Español](README.es.md) | [日本語](README.ja.md) | [Русский](README.ru.md)

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

## Demo model, quota, and privacy

The public demo currently uses Cloudflare Workers AI with `@cf/meta/llama-3.1-8b-instruct-fp8`. Cloudflare's free allocation is currently [10,000 Neurons per day](https://developers.cloudflare.com/workers-ai/platform/pricing/), reset at `00:00 UTC`. This allocation is shared by the Cloudflare account and therefore by all demo visitors; other Workers AI applications in the same account can consume it too. Neurons do not map to a fixed number of essays because usage depends on the model and the amount of input and output text.

Please use the shared AI features considerately: prefer local word completion, wait for an automatic review to finish, and avoid repeatedly running Review, Polish, or Chat on unchanged text. Developers and regular users should deploy their own instance or configure their own compatible model provider.

In this architecture, multi-user isolation relies on browser-local storage rather than server-side accounts. Drafts, finished documents, and custom webmail settings are stored only in the browser's `localStorage`; the application has no server-side draft database. Visitors using different devices, browsers, or browser profiles cannot see one another's local drafts. People sharing the same browser profile also share that profile's site storage, so use separate browser profiles on a shared computer or clear the site's local data afterward.

AI-powered actions send the relevant draft text to the configured model service for processing. The application does not persist those requests, and API responses use `Cache-Control: no-store`, but the public demo should not be used for confidential or sensitive writing.

## Configure

Copy `.env.example` to `.env`, then set `OPENAI_API_KEY`. `OPENAI_MODEL` handles tutoring and review; `OPENAI_AUTOCOMPLETE_MODEL` may use a faster compatible model for inline completion. `OPENAI_BASE_URL` supports an OpenAI-compatible provider.

Never commit `.env` or place an API key in browser-side JavaScript.

## Run

Python 3.9 or newer is required.

```powershell
python -m pip install -r requirements.txt
python server.py
```

Open `http://127.0.0.1:8000`.

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

The live demo is deployed on EdgeOne Pages at [en-intellisense-85d4szue.edgeone.cool](https://en-intellisense-85d4szue.edgeone.cool/). If a direct visit returns `401 Authorization Required`, access protection is still enabled for the preset domain; disable it in the EdgeOne console before sharing the demo publicly. Do not commit or share temporary URLs containing `eo_token`.

To deploy your own copy, import this GitHub repository into EdgeOne Pages, use `main` as the production branch, and leave the build command empty. The checked-in `edgeone.json` publishes `public/` and deploys the Node Functions under `node-functions/`. Those functions forward `/api/*` to the Cloudflare Worker, so no model API key is stored in EdgeOne.

A custom domain can provide a more stable branded address. Mainland China acceleration requires that custom domain to have a valid ICP filing. EdgeOne forwards AI requests to the Cloudflare Worker, so the demo uses the model and shared quota described above.

## Friendly Links

- [LINUX DO - A new kind of community](https://linux.do/)

## License

[MIT](LICENSE)
