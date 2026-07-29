import { providerDefinition, publicProviderCatalog } from './provider-catalog.js';

const PROVIDER_SLOTS = [
  { id: 'primary', label: 'Primary', provider: 'MODEL_PROVIDER', key: 'OPENAI_API_KEY', baseUrl: 'OPENAI_BASE_URL', model: 'OPENAI_MODEL', autocompleteModel: 'OPENAI_AUTOCOMPLETE_MODEL' },
  { id: 'backup_a', label: 'Backup A', provider: 'PROVIDER_BACKUP_A_ID', key: 'PROVIDER_BACKUP_A_API_KEY', baseUrl: 'PROVIDER_BACKUP_A_BASE_URL', model: 'PROVIDER_BACKUP_A_MODEL', autocompleteModel: 'PROVIDER_BACKUP_A_AUTOCOMPLETE_MODEL' },
  { id: 'backup_b', label: 'Backup B', provider: 'PROVIDER_BACKUP_B_ID', key: 'PROVIDER_BACKUP_B_API_KEY', baseUrl: 'PROVIDER_BACKUP_B_BASE_URL', model: 'PROVIDER_BACKUP_B_MODEL', autocompleteModel: 'PROVIDER_BACKUP_B_AUTOCOMPLETE_MODEL' },
];

export function modelProviders(env) {
  return PROVIDER_SLOTS.map(slot => {
    const requestedId = String(env[slot.provider] || 'custom_openai_compatible');
    const definition = providerDefinition(requestedId) || providerDefinition('custom_openai_compatible');
    const baseUrl = String(env[slot.baseUrl] || definition.base_url || '');
    const model = String(env[slot.model] || '');
    const keyConfigured = Boolean(env[slot.key]);
    const configured = keyConfigured && Boolean(baseUrl) && !baseUrl.includes('example.com')
      && Boolean(model) && !model.startsWith('example-');
    return {
      id: slot.id,
      label: slot.label,
      provider_id: definition.id,
      provider_name: definition.name,
      region_policy: definition.region_policy,
      cost_tier: definition.cost_tier,
      recommended_models: definition.recommended_models,
      hosted_allowed: definition.hosted_allowed,
      api_style: definition.api_style,
      configured,
      key_configured: keyConfigured,
      endpoint_host: configured ? safeHostname(baseUrl) : '',
      model: configured ? model : '',
      _api_key: env[slot.key],
      _base_url: baseUrl,
      _autocomplete_model: String(env[slot.autocompleteModel] || ''),
    };
  });
}

function safeHostname(value) {
  try { return new URL(value).hostname; } catch { return ''; }
}

export async function activeModelProviderId(env) {
  if (!env.DB) return 'primary';
  const row = await env.DB.prepare("SELECT value FROM platform_settings WHERE key = 'active_model_provider'").first();
  return String(row?.value || 'primary');
}

export async function resolveModelEnvironment(env) {
  const providers = modelProviders(env);
  const activeId = await activeModelProviderId(env);
  const provider = providers.find(item => item.id === activeId && item.configured)
    || providers.find(item => item.id === 'primary' && item.configured);
  if (!provider) return env;
  const resolved = Object.create(env);
  resolved.OPENAI_API_KEY = provider._api_key;
  resolved.OPENAI_BASE_URL = provider._base_url;
  resolved.OPENAI_MODEL = provider.model;
  resolved.OPENAI_AUTOCOMPLETE_MODEL = provider._autocomplete_model || provider.model;
  resolved.MODEL_API_STYLE = provider.api_style;
  resolved.ACTIVE_MODEL_PROVIDER = provider.id;
  return resolved;
}

export function publicModelProviders(env) {
  return modelProviders(env).map(({ _api_key, _base_url, _autocomplete_model, ...provider }) => provider);
}

export { publicProviderCatalog };
