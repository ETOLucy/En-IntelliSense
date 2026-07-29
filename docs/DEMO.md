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

## 1. Stop switching among an editor, dictionary, and correction website

![WriteMelo workbench with a follow-up email](assets/demo-2.0-workbench.png)

**What you do:** Open WriteMelo and start writing. Choose Letter, Essay, or Message for the appropriate checks.

**What happens:** Documents are listed on the left, writing stays in the center, and actionable issues appear on the right. The header confirms that the current workflow is local.

**What you gain:** Writing, checking, and navigating stay in one place. The draft saves automatically on the device.

**Network / AI:** No network request. No AI.

## 2. You know what you mean, but forming the sentence is slow

![Local inline completion after typing I hope](assets/demo-2.0-inline-completion.png)

**What you do:** Type `I hope ` in a message or email.

**What happens:** WriteMelo displays a quiet inline continuation. Press `Tab` to accept it or `Escape` to dismiss it.

**What you gain:** Common English expressions take fewer keystrokes, but nothing is inserted without your choice.

**Network / AI:** No network request. No AI. The suggestion comes from the local writing core.

## 3. A sentence is marked wrong, but you do not know why

![A local issue explanation and quick fix](assets/demo-2.0-quick-fix.png)

**What you do:** Select the issue for lowercase `i`.

**What happens:** WriteMelo explains the rule and offers an exact replacement. The fix changes only the affected range, not the whole sentence.

**What you gain:** You learn why the expression is wrong and keep control over every edit.

**Network / AI:** No network request. No AI. Spelling and rule-based diagnostics run locally.

## 4. The email is written, but something important may be missing

![Document outline and submission checklist](assets/demo-2.0-outline.png)

**What you do:** Open **Outline**.

**What happens:** Paragraph roles and a letter-specific submission checklist appear. Selecting an outline item returns to that part of the document.

**What you gain:** You can check greeting, body, request, and closing without rereading the draft from scratch.

**Network / AI:** No network request. No AI.

## 5. A rewrite turns out worse than the earlier draft

![Local revision history](assets/demo-2.0-history.png)

**What you do:** Edit the document, then open **Revision history**.

**What happens:** WriteMelo records local snapshots and offers a Restore action.

**What you gain:** Experiment with wording without losing the earlier version.

**Network / AI:** No network request. No AI. Revisions remain on the device.

## 6. You want AI help without uploading the whole draft by default

![Explicit AI consent dialog](assets/demo-2.0-ai-consent.png)

**What you do:** Open **AI**, choose Enable AI, and decide separately whether the full document may be sent.

**What happens:** AI stays unavailable until you confirm. Full-document access is not bundled into the basic consent.

**What you gain:** Local tools remain useful without an account or AI, while deeper review is available only when you request it.

**Network / AI:** Still no request at this step. A request occurs only after consent and after you ask a question.

## 7. You want to choose the AI provider and control the cost

![BYOK provider settings in the Windows app](assets/demo-2.0-byok.png)

**What you do:** In the Windows app, choose OpenAI, Groq, Together AI, OpenRouter, Ollama, or a compatible endpoint. Enter a model and, where required, an API key.

**What happens:** The renderer never receives a saved plaintext key. Electron stores it with Windows `safeStorage`, and the main process sends the request directly to the selected provider.

**What you gain:** Use a provider and model that fit your region, privacy needs, and budget. Ollama can remain entirely local.

**Network / AI:** Remote providers receive the necessary approved text and may charge under their own terms. Ollama on localhost does not send the request to a remote provider.

## The point of the workflow

WriteMelo is useful before AI is enabled: completion reduces typing, diagnostics explain mistakes, quick fixes apply precise edits, outline checks structure, and history protects revisions. AI is an optional final tool, not the product's prerequisite.

## When each feature is useful

| Concrete writing problem | What WriteMelo does | User control | Practical benefit |
| --- | --- | --- | --- |
| You remember only an approximate spelling such as `enviroment` | Fuzzy-matches the intended word `environment` | Insert only after selection | Keep writing without opening a dictionary |
| A long word starts with `conve` | Offers likely complete words | Continue typing or select one | Reduce the cost of typing difficult words |
| You type `I hope ` but form the rest slowly | Shows a quiet inline continuation | `Tab` accepts; `Escape` dismisses | Maintain flow without forced insertion |
| Names, course titles, acronyms, or product terms repeat | Extracts document-specific terms for later completion | Type the first characters as usual | Keep spelling and capitalization consistent |
| A valid name or brand is marked as misspelled | Adds it to the personal dictionary | Confirm each word yourself | Stop repeated false warnings |
| Starting an email, essay, or message is difficult | Offers format-specific snippets | Select and fill in the real details | Overcome the blank page without outsourcing ideas |
| A word is misspelled | Marks it with the local dictionary and offers candidates | Fix it or add it to the dictionary | Catch basics without uploading the draft |
| Lowercase `i` should be `I` | Highlights the exact range and explains the rule | Apply the quick fix explicitly | Correct the error without rewriting the sentence |
| Words are valid but the phrase is unnatural, such as `very like` | Suggests `really like` with an explanation | Accept issues one at a time | Address learner phrasing rather than spelling alone |
| A verb uses the wrong construction, such as `reply me` | Suggests `reply to me` | Accept issues one at a time | Learn recurring English patterns |
| The wrong word class is used, such as `more convenience` | Suggests `more convenient` | Accept issues one at a time | Understand noun and adjective roles |
| US and UK spelling are mixed | Applies the selected English variant | Switch in writing settings | Meet a school or workplace standard |
| Email, essay, and chat need different checks | Letter, Essay, and Message use different snippets and checklists | Choose the document format | Receive advice that matches the real task |
| A learner does not need advanced vocabulary everywhere | Adjusts candidates to the learning level | Choose a level | Keep suggestions understandable |
| A long draft becomes structurally hard to scan | Turns paragraphs into a clickable outline | Select an item to return to the text | Spot missing or unbalanced sections |
| A finished email may lack a greeting, request, or ending | Generates a format-specific submission checklist | Review each item | Catch complete-message problems, not just grammar |
| A rewrite is worse than the original | Stores local revision snapshots automatically | Restore a chosen revision | Experiment without losing earlier work |
| Several emails or essays are in progress | Stores and switches local documents in the left pane | Create, switch, or delete | Keep drafts out of scattered temporary files |
| You do not want an account, network, or AI | Completion, spelling, diagnostics, outline, and history remain local | Leave AI off | Preserve the core value at no AI cost |
| Local rules cannot judge whether a tone is too forceful | Lets you ask AI only after explicit consent | Full-document access is a separate choice | Reserve AI for the problems that need deeper context |
| You already have an API key or do not want a platform plan | Connects the Windows app to your chosen provider | Choose provider, model, and endpoint | Control regional availability and cost |
| Writing must not go to a remote AI | Connects to Ollama on localhost | Run and choose the local model | Keep the AI request on the device |

## Which features do not need AI

WriteMelo's core workflow does not depend on AI. Roughly 80% of everyday capabilities can run on the device; AI is reserved for deeper semantic questions that deterministic rules cannot judge reliably.

### Entirely local

- Word-prefix completion and typo-tolerant candidates.
- Offline English dictionary and spellchecking.
- Reuse of names, course titles, acronyms, and product terms from the current document.
- Personal dictionary.
- Reusable email, essay, and message snippets.
- Fixed-expression inline continuation with `Tab` to accept and `Escape` to dismiss.
- Capitalization, common collocation, and common word-class checks.
- US and UK English selection.
- Format-specific outlines and submission checklists for Letter, Essay, and Message.
- Automatic saving, multiple local documents, and revision history.
- English and Simplified Chinese interface.

These capabilities combine an offline dictionary, spelling algorithms, English rules, common collocations, format snippets, current-document analysis, and candidate ranking. They require no account, network request, or API key.

### Local, with a limited coverage range

- Suggesting the next word or phrase from the preceding text.
- Longer continuations for known expressions.
- Limited grammar, repetition, and clarity checks.
- Adjusting candidates to a learner level.
- Ranking candidates from local usage history.

Frequent patterns such as `I hope → you have been doing well.` and `Thank you for → your time and consideration.` can run locally. Open-ended, rare, or whole-document-dependent continuation cannot be treated as genuinely understood by a rule system.

### Better suited to user-invoked AI

- Judging whether an email sounds forceful, offensive, vague, or unsuitable for a relationship.
- Finding logical contradictions or argument gaps across a complete document.
- Adjusting formality for a specific recipient and purpose.
- Explaining complex sentences not covered by the local rules.
- Offering several natural rewrites and explaining their tone differences.
- Reviewing essay arguments in depth.
- Generating open-ended sentence or paragraph continuations.
- Answering questions about the current document.

The product boundary is:

```text
Local core: frequent, deterministic, low-cost writing support, enabled by default
AI enhancement: semantics, tone, and open-ended generation, invoked by the user
```

WriteMelo does not claim that local rules can exhaust English grammar. It does promise that everyday completion, spelling, common mistakes, terminology consistency, and document structure do not require AI. When deeper understanding is needed, the user decides whether to send text and incur provider costs.
