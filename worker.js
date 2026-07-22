const jsonHeaders = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}

function apiBase(env) {
  const base = (env.OPENAI_BASE_URL || 'https://api.openai.com').replace(/\/$/, '');
  return base.endsWith('/v1') ? base : `${base}/v1`;
}

function headers(env) {
  return { authorization: `Bearer ${env.OPENAI_API_KEY}`, 'content-type': 'application/json', accept: 'application/json', 'user-agent': 'En-IntelliSense/1.0' };
}

async function chatText(env, instructions, prompt, maxTokens = 300, model = env.OPENAI_MODEL) {
  const response = await fetch(`${apiBase(env)}/chat/completions`, {
    method: 'POST', headers: headers(env),
    body: JSON.stringify({ model, messages: [{ role: 'system', content: instructions }, { role: 'user', content: prompt }], max_tokens: maxTokens, stream: false })
  });
  if (!response.ok) throw new Error(`Model API returned ${response.status}`);
  const data = await response.json();
  return data?.choices?.[0]?.message?.content || '';
}

function parseModelJson(output, fallback) {
  const cleaned = output.trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').trim();
  try { return JSON.parse(cleaned); } catch { return fallback; }
}

function completionInstructions(data) {
  const limits = { word: 'the remaining letters of the current word only', phrase: '2 to 8 words', sentence: 'one sentence, at most 24 words' };
  return `You are an inline English autocomplete engine. Continue the text and return only the exact continuation (${limits[data.mode]}), with no label or explanation. Connect grammatically, do not repeat existing text, use ${data.level || 'natural'} English and a ${data.tone || 'natural'} tone for a ${data.format || 'letter'} addressed to ${data.audience || 'a general reader'}. Infer the writer's intention from the full text. Known intent: ${data.intent || 'infer it yourself'}.`;
}

function normalizeCompletion(text, source, mode) {
  let output = text.trim().replace(/^['"]|['"]$/g, '').replace(/\n/g, ' ');
  if (mode !== 'word' && source && !/\s$/.test(source) && /^[A-Za-z0-9]/.test(output)) output = ` ${output}`;
  return output;
}

async function complete(request, env, plain = false) {
  const data = await request.json();
  const text = String(data.text || '').slice(-6000);
  if (!text.trim() || !['word', 'phrase', 'sentence'].includes(data.mode)) return json({ error: 'Invalid completion request' }, 400);
  const output = await chatText(env, completionInstructions(data), `Text to continue:\n${text}`, 60, env.OPENAI_AUTOCOMPLETE_MODEL || env.OPENAI_MODEL);
  const suggestion = normalizeCompletion(output, text, data.mode);
  return plain ? new Response(suggestion, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } }) : json({ suggestion, kind: data.mode });
}

async function review(request, env) {
  const data = await request.json();
  const text = String(data.text || '').trim().slice(0, 7000);
  if (!text) return json({ error: 'Draft cannot be empty' }, 400);
  const instructions = 'Review English writing for a Chinese learner. Infer the communicative intent from the whole draft. Identify only useful grammar, clarity, wording, repetition, or tone issues. Return JSON only: {"intent":"concise Chinese sentence","issues":[{"quote":"exact source substring","replacement":"improved English","message":"concise Chinese reason","category":"grammar|clarity|wording|repetition|tone","severity":"warning|suggestion"}]}. At most 5 non-overlapping issues; every quote must exactly match the draft.';
  const prompt = `Format: ${data.format || 'letter'}\nAudience: ${data.audience || 'general'}\nTone: ${data.tone || 'natural'}\nLevel: ${data.level || 'natural'}\nDraft:\n${text}`;
  const result = parseModelJson(await chatText(env, instructions, prompt, 700), { intent: '', issues: [] });
  result.intent ||= '';
  result.issues = (Array.isArray(result.issues) ? result.issues : []).filter(issue => issue && text.includes(String(issue.quote || '')) && String(issue.replacement || '').trim() && issue.replacement !== issue.quote).slice(0, 5);
  return json(result);
}

async function assist(request, env) {
  const data = await request.json();
  const text = String(data.text || '').trim().slice(0, 6000);
  if (!text) return json({ error: 'Text cannot be empty' }, 400);
  let instructions;
  let prompt;
  if (data.action === 'polish_subject') {
    instructions = 'Help a Chinese learner write a natural English subject. Return JSON only: {"suggestions":[{"text":"...","meaning":"Chinese meaning","tone":"short Chinese tone note"}]}. Give exactly 3 subjects under 8 words and preserve intent.';
    prompt = `Current subject: ${text}\nDraft context: ${String(data.context || '').slice(-3000)}`;
  } else if (data.action === 'polish_text') {
    instructions = `Polish English for a Chinese learner at ${data.level || 'natural'} level. Return JSON only: {"suggestions":[{"text":"...","meaning":"Chinese meaning","tone":"Chinese difference note"}]}. Give exactly 3 alternatives: simple, natural, and expressive. Preserve meaning.`;
    prompt = `Text: ${text}\nContext: ${String(data.context || '').slice(-3000)}`;
  } else if (['explain', 'simplify'].includes(data.action)) {
    instructions = `Act as a patient bilingual tutor for a ${data.level || 'natural'} learner. Return JSON only with translation (natural Chinese), explanation (concise Chinese usage/tone), and simpler (clear English rewrite preserving meaning).`;
    prompt = `Explain and simplify:\n${text}`;
  } else return json({ error: 'Invalid assist action' }, 400);
  const fallback = { translation: '', explanation: '', simpler: text, suggestions: [] };
  const result = parseModelJson(await chatText(env, instructions, prompt, 400), fallback);
  result.source = text;
  return json(result);
}

async function chat(request, env) {
  const data = await request.json();
  const message = String(data.message || '').trim().slice(0, 2000);
  if (!message) return json({ error: 'Message cannot be empty' }, 400);
  const history = (Array.isArray(data.history) ? data.history : []).slice(-8).map(item => `${item.role || 'user'}: ${String(item.content || '').slice(0, 1000)}`).join('\n');
  const prompt = `Current draft:\n${String(data.context || '').slice(-5000)}\n\nSelected text:\n${String(data.selection || '').slice(0, 2000) || '(none)'}\n\nRecent conversation:\n${history || '(none)'}\n\nLearner: ${message}`;
  const instructions = 'You are En-IntelliSense, a bilingual English writing tutor. Reply primarily in concise Chinese with useful English examples. Explain tone and nuance plainly and give immediately usable writing.';
  return json({ reply: (await chatText(env, instructions, prompt, 500)).trim() });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (url.pathname === '/api/status') return json({ configured: Boolean(env.OPENAI_API_KEY), model: env.OPENAI_MODEL, autocomplete_model: env.OPENAI_AUTOCOMPLETE_MODEL });
    if (!env.OPENAI_API_KEY) return json({ error: 'OPENAI_API_KEY is not configured' }, 503);
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    try {
      if (url.pathname === '/api/complete') return await complete(request, env, false);
      if (url.pathname === '/api/complete-stream') return await complete(request, env, true);
      if (url.pathname === '/api/review') return await review(request, env);
      if (url.pathname === '/api/assist') return await assist(request, env);
      if (url.pathname === '/api/chat') return await chat(request, env);
      return json({ error: 'Not found' }, 404);
    } catch (error) {
      return json({ error: error.message || 'Request failed' }, 502);
    }
  }
};
