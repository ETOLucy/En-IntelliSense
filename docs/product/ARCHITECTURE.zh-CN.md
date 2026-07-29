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
       |                       本地展示
       |
       +--> Dexie / IndexedDB --> 文档、版本
       |
       +--> 明确 AI 同意 --> Hono API --> 模型路由

Electron（apps/desktop）只加载构建后的 Web 应用：
关闭 Node 集成，启用上下文隔离和沙箱，并限制页面跳转。
```

## 模块边界

- `packages/contracts`：界面、本地分析和 HTTP 服务共享的数据结构。
- `packages/writing-core`：确定性的写作逻辑，不能依赖界面、数据库、云平台或模型供应商。
- `packages/i18n`：公开支持的英文与简体中文界面。
- `apps/web`：编辑器状态、展示、同意交互和设备持久化。
- `apps/desktop`：仅负责交付与操作系统安全边界。
- `apps/worker`：Hono 路由、中间件、依赖装配和兼容分发。
- `src/cloud` 与 `worker.js`：已经过测试的旧账号、额度、工单和模型业务，按模块逐步缩小。

## 数据与隐私规则

本地分析只在内存中接收文档文本并返回结构化结果。文档、个人词典和版本保存在设备上。AI 不是本地分析的兜底；同意模式为 `off` 时不能发起请求，发送整篇文档还必须满足 `allowFullDocument`。

生产密钥、模型资源池、风控阈值、用户内容和证书只能存在于运行环境，不能进入仓库。

## 后端迁移顺序

1. 登录与 Session。
2. 统一额度账本：reserve → 模型调用 → commit / release。
3. 模型选择与故障转移。
4. 商店验证、支付与邀请。
5. 工单与风控。
6. 每一块通过兼容测试后，最后移除旧适配器。

这样能保持系统始终可运行，同时避免一次性重写带来的业务回归。
