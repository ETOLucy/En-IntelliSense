# 开源与私有数据边界

WriteMelo 可以公开应用、Worker、管理界面、数据库结构和风控逻辑源码。安全性不能依赖隐藏源码；生产环境应依靠身份认证、授权、服务端商店验证、限流、最小权限、密钥轮换和审计记录。

以下内容绝不能提交到公开仓库：

- 用户草稿、提示词、回复、邮箱、工单、账号标识、设备标识或 IP 地址。
- D1/SQLite 数据库文件、导出、备份、审计导出、分析数据导出或原始日志。
- Microsoft Store 收据、权益载荷、退款记录或客户交易导出。
- 真实 `.env`、`.dev.vars`、`store/partner-center.json`、生产 Wrangler 配置、API Key、签名密钥、管理密钥、Azure 凭据、证书或证书密码。
- 从某台机器复制出的 `%APPDATA%\WriteMelo\config.json` 或任何受 DPAPI 保护的用户配置。

可以公开：

- 只包含结构的数据库迁移。
- 使用 `example.com`、`EXAMPLE_*` 和明显虚假标识符的示例配置。
- 使用 `test-key` 等虚假密钥的测试。
- 套餐限制、请求权重、校验逻辑和安全设计。

生产资源保留在 Git 之外：

```text
Microsoft Partner Center       真实产品、定价和提交
Cloudflare Secrets             模型密钥、签名密钥、管理密钥
Cloudflare D1                  订阅、权益和审计记录
Cloudflare Access              管理员身份与 MFA 策略
Windows DPAPI                  每位用户本地保存的 API Key/令牌
```

每次提交或推送前运行：

```powershell
npm run privacy
```

扫描器会检查已跟踪和未跟踪的可发布文件，但不会打印密钥值。它会拦截已知私有接口、常见 API Key 格式、私钥、本地代理端口、Windows 用户路径、证书文件和敏感本地配置。

真实密钥一旦进入提交，仅从最新文件删除并不足够。必须立即撤销和轮换，再在推送或发布前清理 Git 历史。
