# WriteMelo 02 架构

WriteMelo 02 正在迁移为模块化单体。Hono 接管 Cloudflare Worker 的 HTTP 入口，原有行为暂时统一放在一个明确的 legacy 适配器之后。这样可以按业务边界逐个迁移路由，不必一次性重写产品。

## 运行结构

```text
React/Vite Web 应用（规划中）
              |
              v
Hono HTTP 入口：apps/worker/src
              |
       +------+------+
       |             |
新模块路由       legacy 适配器
       |             |
       +------+------+
              |
应用层与领域层（迁移目标）
              |
       +------+------------------+
       |             |           |
      D1        Durable Objects  模型供应商
```

正式部署入口是 `apps/worker/src/index.ts`。当前 `worker.js` 仍是已经过测试的兼容实现，但不应继续加入新的产品领域。新的 HTTP 路由统一放在 `apps/worker/src/routes`。

## 模块边界

- `apps/worker`：HTTP 路由、中间件、响应格式和依赖组装。
- `packages/domain`（规划中）：账号、额度、支付、邀请、模型、工单和风控规则，不包含 HTTP 或 SQL。
- `packages/database`（规划中）：D1 Schema 和 Repository。
- `packages/contracts`（规划中）：前后端共享的请求、响应 Schema。
- `public`：当前浏览器应用，暂时不急着组件化重写。
- `worker.js` 与 `src/cloud`：兼容实现，随着迁移逐步缩小。

HTTP Handler 不能成为业务规则的唯一来源。领域代码不能直接依赖 Hono、D1、Microsoft Store 或模型 SDK。基础设施通过接口为应用层和领域层提供能力。

## 迁移顺序

1. 建立 Hono 入口、TypeScript 检查、健康检查和 legacy 边界。
2. 将登录和 Session 路由迁移到账户应用服务。
3. 用统一额度账本和预占、结算、释放流程替代分散的月额度与单位包扣减。
4. 将线路选择、健康状态、预算和故障转移迁移到 Provider Router。
5. 将商店验证和邀请奖励迁移到支付与邀请模块。
6. 迁移工单和风控 API，最终让 `worker.js` 不再包含应用业务。
7. API 合同稳定后，再将浏览器页面迁移到 React/Vite。

每一步都必须保留既有测试，为迁移后的边界增加测试，并保持随时可以部署。

## 常用命令

```powershell
npm run typecheck
npm run build:worker
npm test
npm run privacy
```

`GET /api/health` 完全由 Hono 管理，只返回架构版本、环境、市场和请求 ID，不暴露密钥。
