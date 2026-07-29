# 账号与管理员界面本地调试

## 启动

在项目根目录运行：

```powershell
npm run account:debug
```

首次启动会自动完成三件事：

1. 在被 Git 忽略的 `.dev.vars` 中生成本地账号哈希密钥和管理员密钥；
2. 将 `migrations` 目录中的迁移应用到本地 D1；
3. 在 `127.0.0.1:8787` 启动 Worker、账号 API 和静态页面。

终端会显示：

- 账号页面：`http://127.0.0.1:8787/support.html`
- 管理员页面：`http://127.0.0.1:8787/support-admin.html`
- 本地管理员密钥

## 本地注册和登录

本地环境不配置邮件服务时，输入任意格式正确且由你控制的测试邮箱。点击“发送验证码”后，六位验证码会直接显示在登录页面，不会发送邮件。

当前采用邮箱验证码登录。用户第一次验证成功时自动创建账号，因此没有单独的“注册”按钮。

## 管理员登录

打开管理员页面，将启动终端里显示的 `Admin secret` 填入“本地开发管理员密钥”。

也可以从 `.dev.vars` 的 `LOCAL_ADMIN_SECRET` 读取，但不要截图、提交或发送该文件。这个密钥只在非生产环境有效。

## 是否需要域名

本地调试不需要域名。

正式上线时建议准备域名，原因包括：

- 邮件验证码服务通常要求验证发件域名；
- Cloudflare Access 管理员登录需要受保护的生产域名；
- 隐私政策、用户协议、退款入口和客服地址需要稳定链接；
- Turnstile 生产站点需要配置允许的主机名；
- 支付回调需要稳定的 HTTPS 地址。

生产环境不要开放“管理员密钥输入框”。管理员 API 应由 Cloudflare Access 验证登录邮箱，并通过 `ADMIN_EMAILS` 白名单授权。

## 生产环境仍需配置

- `ACCOUNT_HASH_PEPPER`：至少 32 位随机值；
- `RESEND_API_KEY` 和 `AUTH_EMAIL_FROM`：发送邮箱验证码；
- `TURNSTILE_SITE_KEY` 和 `TURNSTILE_SECRET_KEY`：人机验证；
- `ADMIN_EMAILS`：允许进入管理后台的邮箱；
- Cloudflare Access：保护管理员页面和管理员 API；
- 正式 D1 数据库 ID 和 Durable Object 配置。

生产密钥使用 `wrangler secret put` 保存，不要写进 `wrangler.jsonc`、源码或 Git。

## 模型线路切换

管理页面提供三个固定槽位：

- `primary`：`OPENAI_API_KEY`、`OPENAI_BASE_URL`、`OPENAI_MODEL`；
- `backup_a`：`PROVIDER_BACKUP_A_API_KEY`、`PROVIDER_BACKUP_A_BASE_URL`、`PROVIDER_BACKUP_A_MODEL`；
- `backup_b`：`PROVIDER_BACKUP_B_API_KEY`、`PROVIDER_BACKUP_B_BASE_URL`、`PROVIDER_BACKUP_B_MODEL`。

本地调试可将测试 Key 写入被 Git 忽略的 `.dev.vars`。生产环境使用：

```powershell
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put PROVIDER_BACKUP_A_API_KEY
npx wrangler secret put PROVIDER_BACKUP_B_API_KEY
```

Base URL 和模型 ID 通过 Worker 环境变量配置。管理页面只返回线路是否配置、供应商主机名和模型 ID，不返回 Key 或 Key 片段。切换操作写入 D1 的 `platform_settings` 和 `admin_audit`。
