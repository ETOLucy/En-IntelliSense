# En-IntelliSense

Context-aware English writing assistance for learners. En-IntelliSense infers the writer's intent from the whole draft, provides word/phrase/sentence completion, reviews problems in context, highlights exact source text, and offers one-click repairs with bilingual explanations.

Live demo: [en-intellisense.etolucy.workers.dev](https://en-intellisense.etolucy.workers.dev)

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
node test_completion.js
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

## Friendly Links

- [LINUX DO - A new kind of community](https://linux.do/)

## License

[MIT](LICENSE)
