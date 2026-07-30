# WriteMelo 架构

WriteMelo 采用模块化单体与本地优先写作核心。浏览器和 Windows 应用共用 React 界面与纯 TypeScript 分析包；只有必须跨越网络边界的能力才进入 Cloudflare Workers。

## 运行时数据流

```text
键盘 / 文档事件
       |
       v
React + CodeMirror（apps/web）
       |
       +--> WritingContext --> packages/writing-core
       |                         | 补全候选
       |                         | 诊断与精确文本编辑
       |                         | 大纲与检查清单
       |                         v
       |                    editor-diagnostics 适配
       |                              |
       |                              v
       |                    CodeMirror lint + 问题面板
       |
       +--> 版本工作流 --> packages/revision-core --> RevisionPreview
       |                         |
       +--> Dexie / IndexedDB <--+ 文档、版本、写作活动
       |
       +--> 浏览器文件适配 / Electron IPC --> 用户授权的文本文件
       |
       +--> 明确 AI 同意 --> Hono API --> 模型路由

Electron（apps/desktop）只加载构建后的 Web 应用：
关闭 Node 集成，启用上下文隔离和沙箱，并限制页面跳转。
```

## 模块边界

- `packages/contracts`：界面、本地分析和 HTTP 服务共享的数据结构。
- `packages/writing-core`：确定性的写作逻辑，不能依赖界面、数据库、云平台或模型供应商。
- `packages/revision-core`：纯文本的词/行级 Diff、统计和摘要，不能访问 Dexie 或渲染界面。
- `packages/i18n`：公开支持的英文与简体中文界面。
- `apps/web/src/editor-diagnostics.ts`：把领域诊断适配为 CodeMirror lint 范围、级别和修复操作。
- `apps/web/src/RevisionPreview.tsx`：只渲染版本比较，不访问持久化。
- `apps/web`：工作流编排、编辑器状态、展示、同意交互、浏览器文件访问和设备持久化。
- `apps/desktop`：负责交付与操作系统安全边界，也承载原生文件对话框和受限文件 IPC。
- `apps/worker`：Hono 路由、中间件、依赖装配和兼容分发。
- `src/cloud` 与 `worker.js`：已经过测试的旧账号、额度、工单和模型业务，按模块逐步缩小。

## 数据与隐私规则

本地分析只在内存中接收文档文本并返回结构化结果。文档、个人词典、写作活动计数和版本保存在设备上。浏览器文件句柄必须来自用户选择；Electron 只允许读写当前会话中通过原生对话框授权的路径。支持的文件内容是 `.txt`、`.text`、`.md`、`.markdown` 纯文本。

AI 不是本地分析的兜底；同意模式为 `off` 时不能发起请求。同意值本身就是数据边界：`question-only` 不带文档，`question-with-document` 才带当前全文。

生产密钥、模型资源池、风控阈值、用户内容和证书只能存在于运行环境，不能进入仓库。

## 后端迁移顺序

1. 登录与 Session。
2. 统一额度账本：reserve → 模型调用 → commit / release。
3. 模型选择与故障转移。
4. 商店验证、支付与邀请。
5. 工单与风控。
6. 每一块通过兼容测试后，最后移除旧适配器。

这样能保持系统始终可运行，同时避免一次性重写带来的业务回归。
