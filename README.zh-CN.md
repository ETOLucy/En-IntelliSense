<div align="center">
  <img src="docs/assets/en-intellisense-mark.svg" width="128" alt="En-IntelliSense 标志" />
  <h1>En-IntelliSense</h1>
  <p><strong>先理解你想表达什么，再帮你写得更自然。</strong></p>
  <p>面向英语学习者的上下文智能补全、审查与润色工具。</p>
  <p>
    <strong>简体中文</strong>
    &nbsp;&middot;&nbsp;
    <a href="README.md">English</a>
    &nbsp;&middot;&nbsp;
    <a href="README.es.md">Español</a>
    &nbsp;&middot;&nbsp;
    <a href="README.ja.md">日本語</a>
    &nbsp;&middot;&nbsp;
    <a href="README.ru.md">Русский</a>
  </p>
  <p>
    <a href="https://en-intellisense-85d4szue.edgeone.cool/">在线演示</a>
    &nbsp;&middot;&nbsp;
    <a href="https://github.com/ETOLucy/En-IntelliSense">GitHub 仓库</a>
  </p>
  <p>
    <a href="https://en-intellisense-85d4szue.edgeone.cool/"><img src="https://img.shields.io/badge/demo-EdgeOne-111111?style=flat-square" alt="EdgeOne 在线演示" /></a>
    <img src="https://img.shields.io/badge/AI-Workers%20AI-111111?style=flat-square" alt="Cloudflare Workers AI" />
    <img src="https://img.shields.io/badge/storage-local--first-111111?style=flat-square" alt="本地优先存储" />
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-111111?style=flat-square" alt="MIT 协议" /></a>
  </p>
</div>

---

En-IntelliSense 会先结合整篇草稿理解用户真正想表达的意思，再给出下一步建议。它将单词、短语和句子补全，与上下文审查、原文问题标记、双语解释和一键修缮整合在同一个写作界面中。

## Demo

![En-IntelliSense 英语写作工作区](docs/assets/demo.png)

### 从中式英语到自然表达

学习者先按照中文逻辑直接写作文。En-IntelliSense 会推断文章真正想表达的观点，在原文中精确标出 5 处问题，用中文解释原因，并提供可以一键应用的自然改写，而不是粗暴地重写整篇文章。

![识别并修正中式英语逻辑](docs/assets/demo-chinese-logic.png)

### 完成邮件并打开常用邮箱

完成书信后，可以选择 QQ 邮箱、163 邮箱、Gmail 或自定义邮箱。系统会把收件人、主题和正文带入写信页面；QQ 邮箱和 163 邮箱还会自动复制完整邮件，以便登录跳转丢失参数时直接粘贴。

![选择邮箱并导入已经完成的邮件](docs/assets/demo-email.png)

## 功能

- 本地单词补全，以及模型驱动的短语和句子补全。
- 从完整草稿推断写作意图，并将意图用于后续补全。
- 停笔后自动审查，也可以手动点击 Review。
- 在原文中标出问题，显示中文原因和替换建议，支持一键修改。
- 标题润色、正文润色、中文翻译、表达解释和简单改写。
- Useful phrases 会替换选中内容或光标所在句子，不会继续追加重复内容。
- 支持书信、作文和消息格式，草稿保存在本地浏览器。
- 完成书信后可选择 QQ 邮箱、163 邮箱、Gmail 或自定义邮箱，并带入收件人、主题和正文；QQ/163 同时自动复制完整邮件作为兜底。
- 已完成文档保存在本地 Finished 列表中，可重新创建编辑副本。

## 演示模型、额度与隐私

公开演示目前通过 Cloudflare Workers AI 使用 `@cf/meta/llama-3.1-8b-instruct-fp8`。Cloudflare 免费账户目前每天提供 [10,000 Neurons](https://developers.cloudflare.com/workers-ai/platform/pricing/)，在 `00:00 UTC`（北京时间 08:00）重置。该额度由整个 Cloudflare 账户共享，因此所有演示访问者以及同一账户下的其他 Workers AI 应用都会消耗它。Neurons 不能直接换算成固定的作文篇数，实际消耗取决于模型、输入长度和输出长度。

请节制使用共享 AI：优先使用不消耗模型额度的本地单词补全，等待自动审查完成，不要对没有变化的文本反复点击 Review、Polish 或 Chat。开发者和长期用户应部署自己的实例，或配置自己的兼容模型服务。

“多用户隔离”在这个架构里依靠浏览器本地存储，而不是创建服务端账户。草稿、Finished 文档和自定义邮箱设置只保存在当前浏览器的 `localStorage` 中，项目没有服务端草稿数据库。不同设备、浏览器或浏览器用户配置之间互相隔离，其他在线访问者看不到你的本地草稿。如果多人共用同一个浏览器用户配置，他们也会共用该站点的本地数据；共用电脑时请使用独立浏览器配置，或使用后清除该站点数据。

使用 AI 补全、审查、润色或聊天时，相关正文会发送到已配置的模型服务进行处理。应用本身不会持久化这些请求，API 响应也设置了 `Cache-Control: no-store`，但仍不建议在公开演示中输入机密或敏感内容。

## 配置与运行

复制 `.env.example` 为 `.env`，设置 `OPENAI_API_KEY`。可通过 `OPENAI_MODEL`、`OPENAI_AUTOCOMPLETE_MODEL` 和 `OPENAI_BASE_URL` 配置兼容模型服务。

```powershell
python -m pip install -r requirements.txt
python server.py
```

打开 `http://127.0.0.1:8000`。不要提交 `.env`，也不要把 API Key 写入前端 JavaScript。

## 测试

```powershell
python -m unittest discover -p "test_*.py"
npm test
```

## 使用方法

- 选择 Auto、Word、Phrase 或 Sentence；按 `Tab` 接受补全，按 `Esc` 忽略。
- 停止输入片刻后会自动审查，也可以点击 Review。
- 点击问题可定位原文，点击 Apply 修改可直接替换。
- 使用 Polish、Explain、Simplify 前可选中文字；未选择时自动使用光标所在句子。
- 点击 Useful phrases 会替换当前句子。

## Cloudflare 部署

仓库通过一个 Worker 同时提供前端和 API。默认使用 Cloudflare Workers AI，因此免费部署不要求外部 API Key。需要改用 OpenAI 兼容服务时，再通过 Secret 配置 `OPENAI_API_KEY` 和 `OPENAI_BASE_URL`。

```powershell
npx wrangler login
npx wrangler deploy

# 可选：外部兼容模型服务
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put OPENAI_BASE_URL
```

## EdgeOne Pages 部署

在线演示已部署到 EdgeOne Pages：[en-intellisense-85d4szue.edgeone.cool](https://en-intellisense-85d4szue.edgeone.cool/)。如果直接访问返回 `401 Authorization Required`，说明预设域名仍开启访问保护；对外分享前需要在 EdgeOne 控制台中关闭访问保护。不要提交或分享含有 `eo_token` 的临时链接。

自行部署时，在 EdgeOne Pages 中导入本 GitHub 仓库，生产分支选择 `main`，构建命令留空。仓库内的 `edgeone.json` 会发布 `public/`，并部署 `node-functions/` 下的 Node Functions。函数会把 `/api/*` 转发到 Cloudflare Worker，因此不需要在 EdgeOne 中保存模型 API Key。

绑定自定义域名可以获得更稳定、易识别的地址；要使用中国大陆节点加速，该自定义域名还需要完成 ICP 备案。EdgeOne 的 AI 请求会转发到 Cloudflare Worker，因此演示站使用上文说明的模型和共享额度。

## 友情链接

- [LINUX DO - 新的理想型社区](https://linux.do/)

## 开源协议

[MIT](LICENSE)
