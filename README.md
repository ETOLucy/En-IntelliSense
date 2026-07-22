# En-IntelliSense

Context-aware English writing assistance for learners. En-IntelliSense infers the writer's intent from the whole draft, provides word/phrase/sentence completion, reviews problems in context, highlights exact source text, and offers one-click repairs with bilingual explanations.

Docs: **English** | [简体中文](README.zh-CN.md) | [Español](README.es.md) | [日本語](README.ja.md)

## Features

- Local word completion and model-powered phrase/sentence completion.
- Whole-draft intent inference passed into subsequent completions.
- Automatic and manual writing review for grammar, clarity, wording, repetition, and tone.
- Exact issue highlighting, source location, Chinese explanation, and one-click replacement.
- Subject and selected-text polishing with three level-appropriate alternatives.
- Translation, explanation, simplification, and contextual bilingual chat.
- Useful phrases replace the selection or current sentence instead of appending duplicate text.
- Letter, essay, and message formats with local draft persistence.

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

The repository includes a Cloudflare Worker configuration for serving the frontend and API from one deployment. Configure Worker secrets before deployment; see the localized docs for the same workflow.

```powershell
npx wrangler login
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put OPENAI_BASE_URL
npx wrangler deploy
```
