# WriteMelo User Guide

[简体中文](USER_GUIDE.zh-CN.md)

## Install and open

Download the installer or portable package from [GitHub Releases](https://github.com/ETOLucy/En-IntelliSense/releases/latest). The Microsoft Store package will be added after certification.

The Windows app opens the writing workspace directly. Python is not required on the target computer.

## Configure your AI service

Version 1 uses your own compatible model service and API key.

1. Open **AI service** from the settings button.
2. Enter the provider endpoint, for example `https://api.example.com`.
3. Enter your API key and a model ID supported by that provider.
4. Choose **Chat Completions** or **Responses** according to the provider documentation.
5. Select **Test connection**, then save the settings.

The same model is used for completion, review, polish, explanation, and chat. The API key stays on this computer, is protected with Windows encryption, and is sent only to the provider endpoint you configure.

## Write

- Choose a format, audience, English level, explanation language, completion mode, and tone.
- Start writing in the main editor.
- Press `Tab` to accept a completion and `Esc` to dismiss it.
- Pause briefly or select **Review** to check the current draft.
- Select text before using **Polish**, **Explain**, or **Simplify**. Without a selection, the current sentence is used.
- Selecting a useful phrase replaces the selection or current sentence.

## Drafts and files

Drafts and finished documents are stored in the current Windows user's local app data. Version 1 does not provide cloud synchronization.

The desktop app can open and save UTF-8 `.txt`, `.md`, and `.markdown` files. Use **Save as** to keep an independent copy. If a file changes in another application, WriteMelo asks before overwriting it.

## Email handoff

For a letter or email, **Finish** can copy the complete message and open the default Windows email application. Check the recipient, subject, and body before sending.

## Troubleshooting

- **AI service is unavailable:** open AI service settings and run the connection test.
- **Authentication error:** confirm the API key with the selected provider.
- **Model not found:** enter a model ID that the provider actually supports.
- **Provider URL error:** use an HTTPS endpoint. Do not add paths unless the provider requires them.
- **Desktop window does not open:** install or repair Microsoft Edge WebView2 Runtime.
- **A local file will not open:** convert it to UTF-8 and keep it below 5 MB.

Never paste an API key into a GitHub issue or commit it to the repository.
