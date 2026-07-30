<div align="center">
  <img src="docs/assets/writemelo-melon-logo.svg" width="280" alt="WriteMelo" />
  <p><strong>WriteMelo（写美了）</strong></p>
  <p><strong>边写边补词、改错并理解原因。</strong></p>
  <p>
    <a href="README.md">English</a>
    &nbsp;&middot;&nbsp;
    <strong>简体中文</strong>
  </p>
  <p>
    <img src="https://img.shields.io/badge/写作-本地优先-23694e?style=flat-square" alt="本地优先写作" />
    <img src="https://img.shields.io/badge/平台-Windows-39718c?style=flat-square" alt="Windows" />
    <img src="https://img.shields.io/badge/界面-中文%20%7C%20English-6b7772?style=flat-square" alt="中英文界面" />
    <img src="https://img.shields.io/badge/AI-可选-b67a24?style=flat-square" alt="可选 AI" />
  </p>
</div>

---

> 拼写检查帮得太少，AI 代写又接管得太多；WriteMelo 在你写作时补全、诊断并解释，最后仍由你决定怎么写。

WriteMelo 是一款本地优先的英语写作 IDE。我们把现代代码编辑器的成熟交互迁移到英文写作：上下文补全、问题诊断、快速修复、文档大纲、版本历史和可选 AI。它不是聊天框，也不是把整篇文章交给模型重写的网页。

仓库现在只有一条产品线。旧的商店重传版与平台版保留在 Git 历史中，后续开发统一基于 TypeScript 架构。

![WriteMelo writing workbench](docs/assets/writemelo-workbench-2.0.png)

**第一次了解 WriteMelo？** 请直接查看[完整操作演示](docs/DEMO.zh-CN.md)：用同一封邮件看懂本地补全、精确修复、大纲检查、版本历史、AI 同意边界和 BYOK。

## 为什么做它

早期写代码时，编辑、编译、查错和修改彼此分离。现代代码编辑器把补全、实时诊断、快速修复、项目导航和版本历史放进同一个工作流，让开发者专注于“要实现什么”，而不是反复切换工具。

英文写作仍然很分散：词典负责查词，拼写工具只画红线，语法网站要求粘贴全文，AI 聊天则经常直接重写。上下文在工具之间丢失，作者也容易失去对表达的控制。

WriteMelo 把这些能力收进一个写作工作台。它理解当前文档中的专有名词和结构，在输入时给出本地补全，在原文上标出问题并提供精确修改；只有用户主动选择时才调用 AI。

| 写代码时 | 写英文时 |
| --- | --- |
| 语言关键字 | 按学习等级排序的英语词汇 |
| 项目变量名 | 当前文章中的专有名词、缩写和产品名 |
| Snippet | 邮件、作文和消息常用表达 |
| Language Service | 本地英语上下文分析器 |
| Quick Fix | 精确范围的一键改正与解释 |
| Document Symbols | 段落大纲与提交检查 |
| Source Control | 本地快照、词级 Diff、恢复与撤销 |
| AI 编程助手 | 由用户明确启用的可选 AI |

## 核心能力

- 基于本地规则、词频和文档实体的英文单词/短语补全。
- 复用当前文章中的专有名词、缩写和混合大小写产品名，不把普通重复词误当成重点。
- 使用 `nspell` 与 49,568 词条 `dictionary-en` 词表的离线英语拼写检查。
- 正文内区分错误、警告和建议，支持悬浮解释、边缘标记、问题面板定位和精确 Quick Fix。
- 邮件、作文和消息片段，以及对应的提交检查清单。
- 文档大纲，以及带词级 Diff、恢复确认和恢复撤销的本地版本历史。
- 个人词典，并可导入 `.txt` 或 Hunspell `.dic` 词典（最多 50,000 个导入词）。
- 文档重命名，以及真正打开、保存和另存为 `.txt`、`.text`、`.md`、`.markdown` 文件。
- 简体中文与英文界面；美式与英式英语写作变体。
- Web 使用 IndexedDB，Windows 使用 Electron 用户目录持久化。
- AI 有三个明确模式：关闭、仅发送问题、问题加当前全文。
- Windows 应用可自备 OpenAI、Groq、Together AI、OpenRouter、Ollama 或兼容接口。

## 使用场景

- **留学生：** 写课程作业、小组消息和给导师的邮件；在原文中补全表达、检查错误，并保持课程名、人名和术语一致。
- **外企员工：** 写英文邮件、周报、会议纪要和工作消息；复用项目名与缩写，减少来回查询和复制到其他网站。
- **外贸与跨境从业者：** 写询盘回复、报价说明、客户跟进和售后消息；快速调用常用表达，同时保留对语气和最终内容的控制。
- **英语学习与备考：** 练习作文、邮件和日常表达；不仅看到修改结果，也能理解错误原因并保留自己的写法。

## 快速开始

<table>
  <tr>
    <td align="center" width="50%">
      <strong>Microsoft Store</strong><br /><br />
      <a href="https://apps.microsoft.com/detail/9NPGS9N22396">
        <img src="https://get.microsoft.com/images/zh-cn%20dark.svg" width="240" alt="从 Microsoft Store 下载 WriteMelo" />
      </a><br />
      <sub>稳定版与自动更新</sub>
    </td>
    <td align="center" width="50%">
      <strong>GitHub beta</strong><br /><br />
      <a href="https://github.com/ETOLucy/WriteMelo/releases/latest"><strong>下载安装包或便携版</strong></a><br /><br />
      <sub>最新预览版与 SHA-256 校验值</sub>
    </td>
  </tr>
</table>

2.0 beta 产物在代码签名证书到位前会明确标注为未签名。

## 架构

```text
apps/web       React、CodeMirror、Dexie
apps/desktop   受限的 Electron Windows 容器
apps/worker    Hono 入口和现有 Cloudflare Worker 业务
packages/
  contracts    共享数据协议
  i18n         中英文界面文本
  revision-core 纯 TypeScript 版本比较与摘要
  writing-core 纯 TypeScript 写作算法
```

`writing-core` 不依赖 React、Electron、Hono、Cloudflare 或任何 AI 供应商。界面把编辑状态整理成 `WritingContext`，核心返回补全候选、诊断、文本编辑、大纲和检查项；编辑器适配层再把诊断映射为 CodeMirror 标记，业务规则不会进入 UI。`revision-core` 只比较文本、不访问 Dexie，Web 层负责展示与本地持久化编排。AI 请求必须经过独立的同意边界。

详细说明见[架构文档](docs/product/ARCHITECTURE.zh-CN.md)和[实现路线](docs/product/IMPLEMENTATION-ROADMAP.zh-CN.md)。

## 开发

需要 Node.js 22 或更高版本。

```powershell
npm install
npm run dev
npm test
npm run test:e2e
npm run build
```

开发界面地址为 `http://127.0.0.1:4173`。

## Windows 构建

```powershell
npm run package:windows
```

构建结果位于 `release/`，包含 NSIS 安装包和便携版。Microsoft 代码签名证书到位前，公开 beta 产物保持未签名并明确标注。

## 隐私

文档、导入的个人词汇、写作活动计数和版本历史保留在设备上。本地补全、拼写和诊断不需要账号或联网。从磁盘打开的文件只会在用户选择后读取或写回。BYOK Key 使用 Windows `safeStorage` 加密保存；经用户同意的请求会直达所选供应商，并受供应商自身留存与计费条款约束。详见[隐私说明](PRIVACY.zh-CN.md)。

## 友情链接

- [LINUX DO - 新的理想型社区](https://linux.do/)

## 许可证

WriteMelo 是自由软件，采用 [GNU General Public License v3.0](LICENSE)（`GPL-3.0-only`）开源。
