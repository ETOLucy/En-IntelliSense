# WriteMelo 完整操作演示

这套 Demo 只完成一个实际任务：把一封英文跟进邮件写好，同时不把草稿直接交给 AI 代写。

```text
Dear Alex,

i am writing to follow up on our meeting. I very like the direction we discussed, and I believe it will give our team more convenience.

Please reply me when you have time.

Best regards,
Melo
```

下列截图全部来自真实运行的应用，可以用 `npm run capture:demo` 重新生成。

## 1. 打开就是写作工作台

![WriteMelo 中的一封英文跟进邮件](assets/demo-2.0-workbench.png)

**你做什么：** 打开 WriteMelo 后直接写作，并按任务选择 Letter、Essay 或 Message。

**界面发生什么：** 左侧管理文档，中间专注写作，右侧只显示可处理的问题；顶部明确显示当前为本地工作流。

**你得到什么：** 写作、检查和定位不再分散到多个网站，草稿会自动保存在本机。

**联网 / AI：** 不联网，不使用 AI。

## 2. 输入时续写常用表达

![输入 I hope 后出现本地灰色续写](assets/demo-2.0-inline-completion.png)

**你做什么：** 在邮件或消息中输入 `I hope `。

**界面发生什么：** 编辑器显示安静的灰色续写；按 `Tab` 接受，按 `Escape` 忽略。

**你得到什么：** 常用英文表达少敲一些字，但没有任何内容会在未经同意时写进文档。

**联网 / AI：** 不联网，不使用 AI；建议来自本地写作核心。

## 3. 理解错误并精确修改

![本地问题解释与一键修复](assets/demo-2.0-quick-fix.png)

**你做什么：** 选中小写 `i` 对应的问题。

**界面发生什么：** WriteMelo 解释规则并给出精确替换，只修改出错范围，不重写整句话。

**你得到什么：** 不只知道“哪里错了”，还能理解原因，并且每次修改仍由你决定。

**联网 / AI：** 不联网，不使用 AI；拼写与规则诊断都在本地运行。

## 4. 发送前检查文章结构

![文档大纲与提交检查清单](assets/demo-2.0-outline.png)

**你做什么：** 打开“大纲”。

**界面发生什么：** 右侧显示各段作用和邮件专用检查清单；点击大纲项可以回到对应段落。

**你得到什么：** 无需从头重读，就能确认问候、正文、请求和结尾是否完整。

**联网 / AI：** 不联网，不使用 AI。

## 5. 回到较早的草稿

![保存在本机的版本历史](assets/demo-2.0-history.png)

**你做什么：** 修改文档后打开“版本历史”。

**界面发生什么：** WriteMelo 在本机记录快照，并提供“恢复”操作。

**你得到什么：** 可以放心尝试不同写法，不怕丢失之前的版本。

**联网 / AI：** 不联网，不使用 AI；历史记录只保存在设备上。

## 6. 决定 AI 能否收到文本

![AI 明确同意窗口](assets/demo-2.0-ai-consent.png)

**你做什么：** 打开“AI”，选择“启用 AI”，再单独决定是否允许发送整篇文档。

**界面发生什么：** 在确认之前 AI 不可使用；允许整篇文档不是默认捆绑选项。

**你得到什么：** 没有账号、没有 AI 时，本地工具仍然完整可用；确实需要深入分析时才主动调用 AI。

**联网 / AI：** 此时仍未发送请求。只有确认后又主动提问，才会调用供应商。

## 7. 自备 AI 服务（BYOK）

![Windows 应用中的 BYOK 供应商设置](assets/demo-2.0-byok.png)

**你做什么：** 在 Windows 应用中选择 OpenAI、Groq、Together AI、OpenRouter、Ollama 或兼容接口，填写模型；远程供应商还需要 API Key。

**界面发生什么：** 渲染界面不会拿到已经保存的明文 Key。Electron 使用 Windows `safeStorage` 加密保存，并由主进程直接请求所选供应商。

**你得到什么：** 可以按所在地区、隐私要求和预算选择供应商与模型；Ollama 还可以完全在本机运行。

**联网 / AI：** 远程供应商会收到完成请求所必需、且经过你同意的文本，并可能按自身条款收费；localhost 上的 Ollama 不会把请求发给远程供应商。

## 这套流程真正解决什么

WriteMelo 在不开启 AI 时已经有完整价值：补全减少输入，诊断解释错误，快速修复精确修改，大纲检查结构，历史保护草稿。AI 是最后可选的一件工具，不是使用产品的前提。
