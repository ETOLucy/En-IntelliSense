<div align="center">
  <img src="docs/assets/logo-mark.svg" width="104" alt="En-IntelliSense Logo Mark" />
  <p><strong>先理解你想表达什么，再帮你写得更自然。</strong></p>
  <p>面向英语学习者的上下文智能补全、审查与润色工具。</p>
  <p>
    <strong>简体中文</strong>
    &nbsp;&middot;&nbsp;
    <a href="README.md">English</a>
  </p>
  <p>
    <a href="#demo">查看效果</a>
    &nbsp;&middot;&nbsp;
    <a href="#下载">下载</a>
    &nbsp;&middot;&nbsp;
    <a href="docs/USER_GUIDE.zh-CN.md">使用指南</a>
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

## 下载

<img src="https://get.microsoft.com/images/en-us%20dark.svg" width="360" alt="从 Microsoft Store 下载" />

**Microsoft Store：** 即将上线。通过微软认证后启用商店链接。

- **GitHub Releases**

  从 [GitHub Releases](https://github.com/ETOLucy/En-IntelliSense/releases/latest) 下载最新安装版或便携版。

第一次使用可以查看[使用指南](docs/USER_GUIDE.zh-CN.md)，完成模型配置并了解主要写作功能。

## Demo

![En-IntelliSense 英语写作工作区](docs/assets/demo.png)

### 界面语言

可以使用应用目前提供的 11 种界面语言，也可以跟随 Windows 系统语言。

![En-IntelliSense 界面语言选择](docs/assets/demo-language.png)

### 接入自己的 AI 服务

填写兼容模型的 API 接口地址、自己的 API Key 和模型 ID。API Key 仅保存在 Windows 设备上，并由 Windows 加密保护。

![En-IntelliSense AI 服务配置](docs/assets/demo-ai-service.png)

## 功能

- 本地单词补全，以及模型驱动的短语和句子补全。
- 从完整草稿推断写作意图，并将意图用于后续补全。
- 停笔后自动审查，也可以手动点击 Review。
- 在原文中标出问题，显示中文原因和替换建议，支持一键修改。
- 标题润色、正文润色、中文翻译、表达解释和简单改写。
- Useful phrases 会替换选中内容或光标所在句子，不会继续追加重复内容。
- 支持书信、作文和消息格式，草稿保存在本地浏览器。
- 完成书信后复制完整邮件，并打开系统默认邮件应用。
- 已完成文档保存在本地 Finished 列表中，可重新创建编辑副本。

## AI 模型、费用与隐私

En-IntelliSense 不包含语言模型、共享 API Key 或免费 AI 额度。AI 短语/句子补全、审查、润色和聊天功能需要每位用户配置自己的 OpenAI 兼容模型服务。费用、限速、数据保留规则和隐私条款均由用户选择的提供商决定；本项目不提供或推荐来源不明的中转站。

没有配置 API Key 时，应用仍可打开，本地单词补全、草稿、Finished 文档和邮件跳转均可使用；右侧会显示 `Add API key for AI`。模型驱动的补全、审查、润色和聊天会保持不可用，直到用户完成配置。

第一版的草稿和 Finished 文档保存在当前 Windows 用户的本地应用数据中，项目尚未提供应用账户或服务端草稿数据库，也不支持跨设备同步。第一版不提供付费订阅，只允许用户配置自己的 API Key。

使用 AI 功能时，相关正文会发送给用户自行选择的模型服务。应用本身不会持久化这些请求，API 响应也设置了 `Cache-Control: no-store`；处理机密或敏感内容前，请确认提供商的隐私条款。桌面版 `.env` 是本地明文文件，请妥善保管，不要提交到 Git，也不要把 API Key 粘贴到 GitHub Issue。

有关本地存储、第三方模型处理、文件访问、数据保留和删除方式，请阅读[隐私政策](PRIVACY.zh-CN.md)。

自行部署 Cloudflare 版本时可以使用 Workers AI，并消耗部署者自己的 Cloudflare 账户额度。该额度不包含在 Windows EXE 中，也不会使用或共享维护者的个人模型资源。

## 配置与运行

复制 `.env.example` 为 `.env`，填写用户自己的模型服务：

```dotenv
OPENAI_API_KEY=your_own_api_key
OPENAI_BASE_URL=https://api.example.com
OPENAI_MODEL=example-model
OPENAI_API_STYLE=chat
```

模型名称必须是所选提供商实际支持的名称。自动补全、润色、审查与聊天默认使用同一个 `OPENAI_MODEL`；只有经过生产验证后，才需要可选的 `OPENAI_AUTOCOMPLETE_MODEL` 覆盖项。

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

## 友情链接

- [LINUX DO - 新的理想型社区](https://linux.do/)

## 开源协议

[MIT](LICENSE)
