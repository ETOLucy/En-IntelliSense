# WriteMelo V2：模型供应商与 Microsoft Store 收费

## 已确定的边界

- 托管服务只使用供应商官方账号和 Worker Secrets，不使用来源不明的中转 Key。
- 中国大陆默认托管供应商：DeepSeek、阿里云百炼、智谱 BigModel、Moonshot。
- OpenAI、Anthropic、Gemini 等按供应商支持地区开放，不把 OpenAI 作为中国大陆托管默认线路。
- 自备 API Key 是独立的 Windows 本地高级模式。Key 使用当前 Windows 账户的 DPAPI 加密，不上传 WriteMelo 云端。
- 收费渠道只使用 Microsoft Store。产品是固定订阅和固定用量包，不建立人民币余额或可提现钱包。

## 单一供应商目录

`provider-catalog.js` 保存经核验的官方兼容目录。`model-providers.js` 只维护三个 Secret 槽位：

- `primary`
- `backup_a`
- `backup_b`

每个槽位通过供应商 ID、模型名、基础地址和 Secret 配置。管理员只能查看供应商、域名和模型，不能读取 Key。切换活动槽位不会复制业务处理器。

已核验目录包括 DeepSeek、阿里云百炼、智谱、Moonshot、OpenAI、Anthropic、Gemini、Mistral、Groq，以及仅供 BYOK 的自定义 OpenAI 兼容端点。百度、火山引擎和腾讯在官方接口及地区条款完成核验前不列为托管预设。

## Microsoft Store 商品

固定 Store ID：

| Store ID | 类型 | 服务端授予 |
| --- | --- | --- |
| `writemelo.plus.monthly` | 月度订阅 | 每周期 3,000 单位 |
| `writemelo.units.1000` | 消耗品 | 1,000 单位 |
| `writemelo.units.5000` | 消耗品 | 5,000 单位 |

价格只在 Partner Center 定义并由 Microsoft Store 展示。客户端不得向服务端提交价格、币种、套餐或单位数。

## 购买链路

1. 打包后的 Windows 客户端使用 `Windows.Services.Store.StoreContext` 发起购买。
2. Win32 窗口必须先把 HWND 关联到 `StoreContext`。
3. 客户端把 Store 购买证据发送到 `/api/store/purchases/verify`。
4. Worker 调用可信的 Microsoft Store 服务端验证组件。
5. Worker 用 Store 商品 ID 映射固定权益，并以交易 ID 幂等入账。
6. 消耗品只有在服务端成功入账后才报告 fulfillment。

当前源码已实现商品目录、幂等数据结构、账户 API 和未打包状态；原生 StoreContext 适配与服务端集合 API 凭据尚需 Partner Center 应用关联后接通。开发包始终返回 `not_store_package`，不会伪造购买成功。

## 数据表

- `store_purchase_events`：购买交易、验证状态和证据哈希。
- `usage_grants`：固定单位授予与剩余数量。
- `account_entitlements`：订阅权益。

所有查询按登录用户隔离。相同 Store 交易 ID 只能入账一次。

## 上线前必须完成

- 在 Partner Center 创建上述三个商品并完成应用关联。
- 实现并部署 Microsoft Store 服务端购买验证组件，配置 `MICROSOFT_STORE_VERIFIER_URL` 与对应 Secret。
- 在正式 MSIX 中接入 HWND 关联的 `StoreContext`。
- 测试购买、取消、重复回调、退款、撤销、恢复购买和消耗品 fulfillment。
- 更新用户协议、隐私政策、退款说明和 Store 商品描述。
