export const PROVIDER_CATALOG = Object.freeze([
  { id: 'deepseek', name: 'DeepSeek', region_policy: 'china', cost_tier: 'low', recommended_models: ['deepseek-chat'], hosted_allowed: true, byok_allowed: true, api_style: 'chat', base_url: 'https://api.deepseek.com', docs_url: 'https://api-docs.deepseek.com/' },
  { id: 'alibaba_model_studio', name: 'Alibaba Cloud Model Studio (Qwen)', region_policy: 'china', cost_tier: 'low', recommended_models: ['qwen-flash', 'qwen-turbo'], hosted_allowed: true, byok_allowed: true, api_style: 'chat', base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', docs_url: 'https://help.aliyun.com/zh/model-studio/compatibility-of-openai-with-dashscope' },
  { id: 'zhipu_bigmodel', name: 'Zhipu BigModel (GLM)', region_policy: 'china', cost_tier: 'low-to-medium', recommended_models: ['glm-4-flash'], hosted_allowed: true, byok_allowed: true, api_style: 'chat', base_url: 'https://open.bigmodel.cn/api/paas/v4', docs_url: 'https://docs.bigmodel.cn/cn/guide/develop/openai/introduction' },
  { id: 'moonshot', name: 'Moonshot (Kimi)', region_policy: 'china', cost_tier: 'medium', recommended_models: ['moonshot-v1-8k'], hosted_allowed: true, byok_allowed: true, api_style: 'chat', base_url: 'https://api.moonshot.cn/v1', docs_url: 'https://platform.moonshot.cn/docs/guide/start-using-kimi-api' },
  { id: 'openai', name: 'OpenAI', region_policy: 'supported-regions-only', cost_tier: 'medium', recommended_models: ['gpt-4.1-mini'], hosted_allowed: false, byok_allowed: true, api_style: 'responses', base_url: 'https://api.openai.com/v1', docs_url: 'https://developers.openai.com/api/docs/supported-countries' },
  { id: 'anthropic', name: 'Anthropic', region_policy: 'supported-regions-only', cost_tier: 'medium', recommended_models: ['claude-haiku'], hosted_allowed: false, byok_allowed: true, api_style: 'chat', base_url: 'https://api.anthropic.com/v1', docs_url: 'https://docs.anthropic.com/en/api/openai-sdk' },
  { id: 'gemini', name: 'Google Gemini', region_policy: 'supported-regions-only', cost_tier: 'low', recommended_models: ['gemini-flash'], hosted_allowed: false, byok_allowed: true, api_style: 'chat', base_url: 'https://generativelanguage.googleapis.com/v1beta/openai', docs_url: 'https://ai.google.dev/gemini-api/docs/openai' },
  { id: 'mistral', name: 'Mistral AI', region_policy: 'global-check-required', cost_tier: 'low-to-medium', recommended_models: ['mistral-small'], hosted_allowed: false, byok_allowed: true, api_style: 'chat', base_url: 'https://api.mistral.ai/v1', docs_url: 'https://docs.mistral.ai/api/' },
  { id: 'groq', name: 'Groq', region_policy: 'global-check-required', cost_tier: 'low', recommended_models: ['llama-small'], hosted_allowed: false, byok_allowed: true, api_style: 'chat', base_url: 'https://api.groq.com/openai/v1', docs_url: 'https://console.groq.com/docs/openai' },
  { id: 'custom_openai_compatible', name: 'Custom OpenAI-compatible endpoint', region_policy: 'operator-review-required', cost_tier: 'unknown', recommended_models: [], hosted_allowed: false, byok_allowed: true, api_style: 'chat', base_url: '', docs_url: '' },
]);

export function providerDefinition(id) {
  return PROVIDER_CATALOG.find(provider => provider.id === id) || null;
}

export function publicProviderCatalog() {
  return PROVIDER_CATALOG.map(provider => ({ ...provider }));
}
