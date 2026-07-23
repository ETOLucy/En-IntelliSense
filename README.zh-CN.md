<div align="center">
  <picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/logo-dark.svg"><img src="docs/assets/en-intellisense-logo.svg" width="340" alt="En-IntelliSense Logo" /></picture>
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
    <a href="#demo">查看效果</a>
    &nbsp;&middot;&nbsp;
    <a href="https://github.com/ETOLucy/En-IntelliSense/releases/latest">下载 Windows EXE</a>
    &nbsp;&middot;&nbsp;
    <a href="#配置与运行">本地运行</a>
    &nbsp;&middot;&nbsp;
    <a href="https://github.com/ETOLucy/En-IntelliSense">GitHub 仓库</a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/补全-单词%20%7C%20短语%20%7C%20句子-1f6f5b?style=flat-square" alt="单词、短语和句子补全" />
    <img src="https://img.shields.io/badge/AI-用户自备模型-3a7ca5?style=flat-square" alt="用户自备模型" />
    <img src="https://img.shields.io/badge/存储-本地优先-3a7ca5?style=flat-square" alt="本地优先存储" />
    <a href="LICENSE"><img src="https://img.shields.io/badge/协议-MIT-c65d3b?style=flat-square" alt="MIT 协议" /></a>
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

## AI 模型、费用与隐私

En-IntelliSense 不包含语言模型、共享 API Key 或免费 AI 额度。AI 短语/句子补全、审查、润色和聊天功能需要每位用户配置自己的 OpenAI 兼容模型服务。费用、限速、数据保留规则和隐私条款均由用户选择的提供商决定；本项目不提供或推荐来源不明的中转站。

没有配置 API Key 时，应用仍可打开，本地单词补全、草稿、Finished 文档和邮件跳转均可使用；右侧会显示 `Add API key for AI`。模型驱动的补全、审查、润色和聊天会保持不可用，直到用户完成配置。

“多用户隔离”在这个架构里依靠浏览器本地存储，而不是创建服务端账户。草稿、Finished 文档和自定义邮箱设置只保存在当前浏览器的 `localStorage` 中，项目没有服务端草稿数据库。不同设备、浏览器或浏览器用户配置之间互相隔离，其他在线访问者看不到你的本地草稿。如果多人共用同一个浏览器用户配置，他们也会共用该站点的本地数据；共用电脑时请使用独立浏览器配置，或使用后清除该站点数据。

使用 AI 功能时，相关正文会发送给用户自行选择的模型服务。应用本身不会持久化这些请求，API 响应也设置了 `Cache-Control: no-store`；处理机密或敏感内容前，请确认提供商的隐私条款。桌面版 `.env` 是本地明文文件，请妥善保管，不要提交到 Git，也不要把 API Key 粘贴到 GitHub Issue。

自行部署 Cloudflare 版本时可以使用 Workers AI，并消耗部署者自己的 Cloudflare 账户额度。该额度不包含在 Windows EXE 中，也不会使用或共享维护者的个人模型资源。

## 配置与运行

复制 `.env.example` 为 `.env`，填写用户自己的模型服务：

```dotenv
OPENAI_API_KEY=your_own_api_key
OPENAI_BASE_URL=https://api.openai.com
OPENAI_MODEL=gpt-4.1-mini
OPENAI_AUTOCOMPLETE_MODEL=gpt-4.1-mini
OPENAI_API_STYLE=chat
```

模型名称必须是所选提供商实际支持的名称。`OPENAI_MODEL` 用于辅导和审查，`OPENAI_AUTOCOMPLETE_MODEL` 可配置速度更快的补全模型；兼容提供商可以使用不同的 `OPENAI_BASE_URL`。

```powershell
python -m pip install -r requirements.txt
python server.py
```

打开 `http://127.0.0.1:8000`。不要提交 `.env`，也不要把 API Key 写入前端 JavaScript。

## Windows 桌面版

普通使用时，从 [GitHub 最新版本](https://github.com/ETOLucy/En-IntelliSense/releases/latest) 下载 `En-IntelliSense-Setup.exe`。安装程序会创建开始菜单快捷方式，并可选择创建桌面快捷方式；不需要终端、Python 或任何构建命令。不希望安装时，也可以下载 `En-IntelliSense-Portable.zip`。

> **签名状态：** 没有配置签名证书时，安装包仍可生成和使用，但 Windows 可能显示“未知发布者”或 SmartScreen 警告。构建脚本支持稍后为主程序和安装包添加签名及可信时间戳。

下面的命令只供修改源码后需要重新生成 EXE 的开发者使用：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build_windows.ps1
```

安装版产物为 `dist/En-IntelliSense-Setup.exe`，便携版为 `dist/En-IntelliSense-Portable.zip`。本地没有安装 Inno Setup 6 时，脚本仍会构建便携版并跳过安装包。应用会把本地 Python 服务和前端一起打包，启动时自动选择空闲的回环端口，并在原生 WebView2 窗口中打开工作区。运行成品不要求用户另外安装 Python；当前 Windows 10/11 通常已自带所需的 Microsoft Edge WebView2 Runtime。

API Key 和维护者个人模型资源都不会被写进程序。桌面版首次启动会打开 Model settings，用户可以填写 OpenAI 或兼容服务的地址、API Key、模型名称和 API 类型，并在保存前测试连接。API Key 使用 Windows DPAPI 为当前 Windows 账户加密，配置保存在 `%APPDATA%\En-IntelliSense\config.json`，保存后立即生效。环境变量和 `.env` 仍保留为开发者兼容入口。

以后取得 PFX 代码签名证书时，可设置 `WINDOWS_CERTIFICATE_PATH`、`WINDOWS_CERTIFICATE_PASSWORD` 和可选的 `WINDOWS_TIMESTAMP_URL` 后运行同一个构建命令。GitHub Actions 对应使用 `WINDOWS_CERTIFICATE_BASE64` 与 `WINDOWS_CERTIFICATE_PASSWORD` 仓库 Secret。

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

自行部署时，在 EdgeOne Pages 中导入本 GitHub 仓库，生产分支选择 `main`，构建命令留空。仓库内的 `edgeone.json` 会发布 `public/`，并部署 `node-functions/` 下的 Node Functions。函数会把 `/api/*` 转发到 Cloudflare Worker，因此不需要在 EdgeOne 中保存模型 API Key。

## 友情链接

- [LINUX DO - 新的理想型社区](https://linux.do/)

## 开源协议

[MIT](LICENSE)
