# EnWrite

EnWrite is a functional English writing workspace with three levels of autocomplete: instant local word completion plus model-powered phrase and sentence completion. It supports letters, essays, and casual messages while keeping API credentials on the server.

## Configure

Copy `.env.example` to `.env`, then set `OPENAI_API_KEY`. `OPENAI_MODEL` handles tutoring and polishing; `OPENAI_AUTOCOMPLETE_MODEL` can use a faster model for inline completion. You can also set `OPENAI_BASE_URL` for an OpenAI-compatible provider. Never put the API key in `app.js`.

## Run

Python 3.9 or newer is required.

```powershell
python -m pip install -r requirements.txt
python server.py
```

Open `http://127.0.0.1:8000`. Opening `index.html` directly still shows the editor and word completion, but phrase and sentence completion require the server.

Run the automated checks with:

```powershell
python -m unittest test_server.py
node test_completion.js
```

## Interactions

- Choose Auto, Word, Phrase, or Sentence completion.
- Word completion runs locally and appears immediately after typing at least two letters.
- Phrase and sentence completion call the configured model after a short pause.
- Common continuations use an immediate context-ranked local prediction while model completions stream progressively and are cached by context.
- Polish a letter subject into three natural alternatives with Chinese meaning and tone notes.
- Polish selected body text into three comparable alternatives and apply one with a click.
- Select text (or place the cursor in a sentence) to see a Chinese translation, usage explanation, and simpler English rewrite.
- Use Ask AI for a contextual bilingual conversation about the current subject, draft, or selected text.
- Press `Tab` to accept a suggestion or `Esc` to dismiss it.
- Switch between Simple, Natural, and Advanced English.
- Click useful phrases to insert them at the cursor.
- Draft text is saved locally in the browser.
- Use Share or Copy invite link to recommend the tool.
