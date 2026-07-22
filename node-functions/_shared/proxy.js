const DEFAULT_API_UPSTREAM = 'https://en-intellisense.etolucy.workers.dev';
const REQUEST_HEADERS = ['accept', 'accept-language', 'content-type'];
const RESPONSE_HEADERS = ['cache-control', 'content-type', 'retry-after'];

function resolveUpstream(env) {
  const value = String(env?.API_UPSTREAM || DEFAULT_API_UPSTREAM).trim();
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error('API_UPSTREAM must use HTTPS');
  return url.origin;
}

function normalizeWordSuggestion(suggestion, source) {
  const candidate = String(suggestion || '').trim().match(/^[A-Za-z'-]+/)?.[0] || '';
  const fragment = String(source || '').match(/[A-Za-z'-]+$/)?.[0] || '';
  if (fragment && candidate.toLowerCase().startsWith(fragment.toLowerCase())) {
    return candidate.slice(fragment.length);
  }
  return candidate;
}

export async function proxyApiRequest(context, fetchImpl = fetch) {
  const request = context.request;
  const incomingUrl = new URL(request.url);
  const headers = new Headers();
  for (const name of REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set('x-en-intellisense-gateway', 'edgeone');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  try {
    const upstreamUrl = new URL(`${incomingUrl.pathname}${incomingUrl.search}`, `${resolveUpstream(context.env)}/`);
    const requestBody = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer();
    const upstream = await fetchImpl(upstreamUrl, {
      method: request.method,
      headers,
      body: requestBody,
      redirect: 'manual',
      signal: controller.signal
    });
    const responseHeaders = new Headers();
    for (const name of RESPONSE_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    responseHeaders.set('x-en-intellisense-origin', 'edgeone');
    let responseBody = upstream.body;
    if (upstream.ok && requestBody && ['/api/complete', '/api/complete-stream'].includes(incomingUrl.pathname)) {
      let completionRequest;
      try {
        completionRequest = JSON.parse(new TextDecoder().decode(requestBody));
      } catch {
        completionRequest = null;
      }
      if (completionRequest?.mode === 'word') {
        if (incomingUrl.pathname === '/api/complete') {
          const payload = await upstream.json();
          payload.suggestion = normalizeWordSuggestion(payload.suggestion, completionRequest.text);
          responseBody = JSON.stringify(payload);
        } else {
          responseBody = normalizeWordSuggestion(await upstream.text(), completionRequest.text);
        }
      }
    }
    return new Response(responseBody, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders
    });
  } catch (error) {
    const message = error?.name === 'AbortError' ? 'AI service timed out' : 'AI service is temporarily unavailable';
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-en-intellisense-origin': 'edgeone'
      }
    });
  } finally {
    clearTimeout(timeout);
  }
}

export { DEFAULT_API_UPSTREAM };
