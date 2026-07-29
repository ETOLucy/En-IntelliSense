# WriteMelo Guided Demo

This demo follows one practical task: improving a follow-up email without handing the draft to an AI writer.

```text
Dear Alex,

i am writing to follow up on our meeting. I very like the direction we discussed, and I believe it will give our team more convenience.

Please reply me when you have time.

Best regards,
Melo
```

Every screenshot below comes from the working application. You can reproduce them with `npm run capture:demo`.

## 1. Start in the writing workbench

![WriteMelo workbench with a follow-up email](assets/demo-2.0-workbench.png)

**What you do:** Open WriteMelo and start writing. Choose Letter, Essay, or Message for the appropriate checks.

**What happens:** Documents are listed on the left, writing stays in the center, and actionable issues appear on the right. The header confirms that the current workflow is local.

**What you gain:** Writing, checking, and navigating stay in one place. The draft saves automatically on the device.

**Network / AI:** No network request. No AI.

## 2. Continue a phrase while typing

![Local inline completion after typing I hope](assets/demo-2.0-inline-completion.png)

**What you do:** Type `I hope ` in a message or email.

**What happens:** WriteMelo displays a quiet inline continuation. Press `Tab` to accept it or `Escape` to dismiss it.

**What you gain:** Common English expressions take fewer keystrokes, but nothing is inserted without your choice.

**Network / AI:** No network request. No AI. The suggestion comes from the local writing core.

## 3. Understand and fix an exact issue

![A local issue explanation and quick fix](assets/demo-2.0-quick-fix.png)

**What you do:** Select the issue for lowercase `i`.

**What happens:** WriteMelo explains the rule and offers an exact replacement. The fix changes only the affected range, not the whole sentence.

**What you gain:** You learn why the expression is wrong and keep control over every edit.

**Network / AI:** No network request. No AI. Spelling and rule-based diagnostics run locally.

## 4. Check structure before sending

![Document outline and submission checklist](assets/demo-2.0-outline.png)

**What you do:** Open **Outline**.

**What happens:** Paragraph roles and a letter-specific submission checklist appear. Selecting an outline item returns to that part of the document.

**What you gain:** You can check greeting, body, request, and closing without rereading the draft from scratch.

**Network / AI:** No network request. No AI.

## 5. Return to an earlier draft

![Local revision history](assets/demo-2.0-history.png)

**What you do:** Edit the document, then open **Revision history**.

**What happens:** WriteMelo records local snapshots and offers a Restore action.

**What you gain:** Experiment with wording without losing the earlier version.

**Network / AI:** No network request. No AI. Revisions remain on the device.

## 6. Decide whether AI may receive text

![Explicit AI consent dialog](assets/demo-2.0-ai-consent.png)

**What you do:** Open **AI**, choose Enable AI, and decide separately whether the full document may be sent.

**What happens:** AI stays unavailable until you confirm. Full-document access is not bundled into the basic consent.

**What you gain:** Local tools remain useful without an account or AI, while deeper review is available only when you request it.

**Network / AI:** Still no request at this step. A request occurs only after consent and after you ask a question.

## 7. Bring your own provider

![BYOK provider settings in the Windows app](assets/demo-2.0-byok.png)

**What you do:** In the Windows app, choose OpenAI, Groq, Together AI, OpenRouter, Ollama, or a compatible endpoint. Enter a model and, where required, an API key.

**What happens:** The renderer never receives a saved plaintext key. Electron stores it with Windows `safeStorage`, and the main process sends the request directly to the selected provider.

**What you gain:** Use a provider and model that fit your region, privacy needs, and budget. Ollama can remain entirely local.

**Network / AI:** Remote providers receive the necessary approved text and may charge under their own terms. Ollama on localhost does not send the request to a remote provider.

## The point of the workflow

WriteMelo is useful before AI is enabled: completion reduces typing, diagnostics explain mistakes, quick fixes apply precise edits, outline checks structure, and history protects revisions. AI is an optional final tool, not the product's prerequisite.
