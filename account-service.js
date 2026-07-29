import { activeModelProviderId, publicModelProviders, publicProviderCatalog } from './model-providers.js';
import { publicStoreProducts, storeProduct } from './store-products.js';

const encoder = new TextEncoder();
const ACCOUNT_JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
};
const SESSION_LIFETIME_MS = 30 * 86400000;
const CHALLENGE_LIFETIME_MS = 10 * 60000;
const TICKET_CATEGORIES = new Set(['account', 'billing', 'technical', 'model', 'privacy', 'feedback', 'other']);
const TICKET_STATUSES = new Set(['open', 'waiting_for_user', 'in_progress', 'resolved', 'closed']);
const TICKET_PRIORITIES = new Set(['low', 'normal', 'high', 'urgent']);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: ACCOUNT_JSON_HEADERS });
}

function base64Url(bytes) {
  let value = '';
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomToken(bytes = 32) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return base64Url(value);
}

async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function protectedHash(value, env) {
  const pepper = String(env.ACCOUNT_HASH_PEPPER || '');
  if (pepper.length < 32) throw new Error('ACCOUNT_HASH_PEPPER is not configured');
  return sha256(`${pepper}:${value}`);
}

export function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '';
  return email;
}

function bearerToken(request) {
  const header = request.headers.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

function sourceIp(request) {
  return request.headers.get('cf-connecting-ip') || 'local';
}

async function requestJson(request) {
  const type = request.headers.get('content-type') || '';
  if (!type.toLowerCase().includes('application/json')) throw new Error('JSON body required');
  return request.json();
}

async function verifyTurnstile(request, env, token) {
  if (!env.TURNSTILE_SECRET_KEY) {
    if (String(env.ENVIRONMENT || '').toLowerCase() === 'production') {
      throw new Error('Turnstile is not configured');
    }
    return;
  }
  if (!token) throw new Error('Human verification required');
  const body = new FormData();
  body.set('secret', env.TURNSTILE_SECRET_KEY);
  body.set('response', token);
  const ip = sourceIp(request);
  if (ip !== 'local') body.set('remoteip', ip);
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error('Human verification failed');
}

async function sendLoginCode(env, email, code) {
  if (!env.RESEND_API_KEY || !env.AUTH_EMAIL_FROM) {
    if (String(env.ENVIRONMENT || '').toLowerCase() === 'production') {
      throw new Error('Login email service is not configured');
    }
    return false;
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: env.AUTH_EMAIL_FROM,
      to: [email],
      subject: 'Your WriteMelo sign-in code',
      text: `Your WriteMelo sign-in code is ${code}. It expires in 10 minutes. If you did not request this code, ignore this email.`,
    }),
  });
  if (!response.ok) throw new Error('Login email could not be sent');
  return true;
}

async function requestLoginCode(request, env) {
  if (!env.DB) return json({ error: 'Account database is not configured' }, 503);
  const data = await requestJson(request);
  const email = normalizeEmail(data.email);
  if (!email) return json({ error: 'Enter a valid email address', code: 'invalid_email' }, 400);
  await verifyTurnstile(request, env, data.turnstile_token);

  const now = Date.now();
  const ipHash = await protectedHash(sourceIp(request), env);
  const recentEmail = await env.DB.prepare(
    'SELECT COUNT(*) AS count FROM auth_challenges WHERE email = ? AND created_at > ?',
  ).bind(email, now - 3600000).first();
  const recentIp = await env.DB.prepare(
    'SELECT COUNT(*) AS count FROM auth_challenges WHERE source_ip_hash = ? AND created_at > ?',
  ).bind(ipHash, now - 3600000).first();
  if (Number(recentEmail?.count || 0) >= 5 || Number(recentIp?.count || 0) >= 20) {
    return json({ error: 'Too many sign-in attempts. Try again later.', code: 'rate_limited' }, 429);
  }

  const challengeId = crypto.randomUUID();
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0');
  const codeHash = await protectedHash(`${challengeId}:${code}`, env);
  await env.DB.prepare(
    `INSERT INTO auth_challenges
      (id, email, code_hash, source_ip_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).bind(challengeId, email, codeHash, ipHash, now + CHALLENGE_LIFETIME_MS, now).run();

  const delivered = await sendLoginCode(env, email, code);
  const response = { ok: true, challenge_id: challengeId, expires_in: CHALLENGE_LIFETIME_MS / 1000 };
  if (!delivered && String(env.ENVIRONMENT || '').toLowerCase() !== 'production') response.development_code = code;
  return json(response, 202);
}

async function createSession(env, userId, request, now) {
  const token = randomToken();
  const tokenHash = await protectedHash(token, env);
  const device = String(request.headers.get('x-writemelo-device') || '').slice(0, 200);
  const deviceHash = device ? await protectedHash(device, env) : '';
  const ipHash = await protectedHash(sourceIp(request), env);
  const sessionId = crypto.randomUUID();
  const expiresAt = now + SESSION_LIFETIME_MS;
  await env.DB.prepare(
    `INSERT INTO user_sessions
      (id, user_id, token_hash, device_hash, source_ip_hash, expires_at, created_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(sessionId, userId, tokenHash, deviceHash, ipHash, expiresAt, now, now).run();
  return { token, expiresAt };
}

async function verifyLoginCode(request, env) {
  if (!env.DB) return json({ error: 'Account database is not configured' }, 503);
  const data = await requestJson(request);
  const email = normalizeEmail(data.email);
  const challengeId = String(data.challenge_id || '');
  const code = String(data.code || '').trim();
  if (!email || !challengeId || !/^\d{6}$/.test(code)) {
    return json({ error: 'Invalid sign-in code', code: 'invalid_code' }, 400);
  }

  const challenge = await env.DB.prepare(
    `SELECT id, email, code_hash, attempts, expires_at, consumed_at
     FROM auth_challenges WHERE id = ? AND email = ?`,
  ).bind(challengeId, email).first();
  const now = Date.now();
  if (!challenge || challenge.consumed_at || Number(challenge.expires_at) <= now || Number(challenge.attempts) >= 5) {
    return json({ error: 'Sign-in code expired or invalid', code: 'invalid_code' }, 400);
  }
  const codeHash = await protectedHash(`${challengeId}:${code}`, env);
  if (codeHash !== challenge.code_hash) {
    await env.DB.prepare('UPDATE auth_challenges SET attempts = attempts + 1 WHERE id = ?').bind(challengeId).run();
    return json({ error: 'Sign-in code expired or invalid', code: 'invalid_code' }, 400);
  }
  const consumed = await env.DB.prepare(
    `UPDATE auth_challenges SET consumed_at = ?
     WHERE id = ? AND consumed_at IS NULL AND expires_at > ?`,
  ).bind(now, challengeId, now).run();
  if (Number(consumed?.meta?.changes || 0) !== 1) {
    return json({ error: 'Sign-in code expired or invalid', code: 'invalid_code' }, 400);
  }

  let user = await env.DB.prepare(
    'SELECT id, email, status, role FROM users WHERE email = ?',
  ).bind(email).first();
  if (user?.status && user.status !== 'active') {
    return json({ error: 'Account is not active', code: 'account_inactive' }, 403);
  }
  if (!user) {
    const userId = `usr_${randomToken(18)}`;
    await env.DB.prepare(
      `INSERT INTO users (id, email, created_at, updated_at, last_login_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).bind(userId, email, now, now, now).run();
    const periodEnd = now + 31 * 86400000;
    await env.DB.prepare(
      `INSERT INTO account_entitlements
        (user_id, plan, status, monthly_units, requests_per_minute, device_limit,
         period_start, period_end, source, created_at, updated_at)
       VALUES (?, 'beta', 'active', 300, 15, 2, ?, ?, 'beta', ?, ?)`,
    ).bind(userId, now, periodEnd, now, now).run();
    user = { id: userId, email, status: 'active', role: 'user' };
  } else {
    await env.DB.prepare(
      'UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?',
    ).bind(now, now, user.id).run();
  }

  const session = await createSession(env, user.id, request, now);
  return json({
    access_token: session.token,
    token_type: 'Bearer',
    expires_at: session.expiresAt,
    user: { id: user.id, email: user.email, role: user.role },
  });
}

export async function authenticateSession(request, env) {
  if (!env.DB) throw new Error('Account database is not configured');
  const token = bearerToken(request);
  if (!token) throw new Error('Sign-in required');
  const tokenHash = await protectedHash(token, env);
  const now = Date.now();
  const session = await env.DB.prepare(
    `SELECT s.id AS session_id, s.user_id, s.expires_at, s.last_seen_at, u.email, u.status, u.role
     FROM user_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?`,
  ).bind(tokenHash, now).first();
  if (!session || session.status !== 'active') throw new Error('Session expired');
  if (now - Number(session.last_seen_at || 0) > 300000) {
    await env.DB.prepare('UPDATE user_sessions SET last_seen_at = ? WHERE id = ?').bind(now, session.session_id).run();
  }
  return {
    id: session.user_id,
    email: session.email,
    role: session.role,
    sessionId: session.session_id,
  };
}

export async function consumeAccountUsage(request, env, user, route) {
  if (!env.SUBSCRIPTION_GUARD) throw new Error('Account usage guard is not configured');
  const entitlement = await env.DB.prepare(
    `SELECT plan, status, monthly_units, requests_per_minute, device_limit, period_end
     FROM account_entitlements WHERE user_id = ?`,
  ).bind(user.id).first();
  const now = Date.now();
  if (!entitlement || entitlement.status !== 'active' || Number(entitlement.period_end) <= now) {
    return json({ error: 'Hosted AI allowance is not active', code: 'entitlement_inactive' }, 403);
  }
  const claims = {
    plan: entitlement.plan === 'pro' ? 'pro' : 'standard',
    monthly_units: Number(entitlement.monthly_units),
    rpm: Number(entitlement.requests_per_minute),
    devices: Number(entitlement.device_limit),
  };
  const device = request.headers.get('x-writemelo-device')
    || request.headers.get('cf-connecting-ip')
    || 'unknown';
  const id = env.SUBSCRIPTION_GUARD.idFromName(user.id);
  const response = await env.SUBSCRIPTION_GUARD.get(id).fetch('https://guard.internal/consume', {
    method: 'POST',
    body: JSON.stringify({ action: 'consume', claims, route, device }),
  });
  if (response.ok) return null;
  const result = await response.json();
  return json(result, response.status);
}

async function logout(request, env) {
  const user = await authenticateSession(request, env);
  await env.DB.prepare(
    'UPDATE user_sessions SET revoked_at = ? WHERE id = ? AND user_id = ?',
  ).bind(Date.now(), user.sessionId, user.id).run();
  return json({ ok: true });
}

async function accountProfile(request, env) {
  const user = await authenticateSession(request, env);
  const entitlement = await env.DB.prepare(
    `SELECT plan, status, monthly_units, requests_per_minute, device_limit,
            period_start, period_end, source
     FROM account_entitlements WHERE user_id = ?`,
  ).bind(user.id).first();
  return json({ user: { id: user.id, email: user.email, role: user.role }, entitlement: entitlement || null });
}

async function storeProducts(request, env) {
  await authenticateSession(request, env);
  return json({
    channel: 'microsoft_store',
    products: publicStoreProducts(),
    purchase_verification: env.MICROSOFT_STORE_VERIFIER_URL ? 'available' : 'not_configured',
  });
}

async function storeEntitlements(request, env) {
  const user = await authenticateSession(request, env);
  const purchases = await env.DB.prepare(
    `SELECT store_product_id, purchase_kind, verification_status, verified_at, created_at
     FROM store_purchase_events WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`,
  ).bind(user.id).all();
  const grants = await env.DB.prepare(
    `SELECT g.units, g.remaining_units, g.expires_at, g.created_at
     FROM usage_grants g WHERE g.user_id = ? ORDER BY g.created_at DESC LIMIT 100`,
  ).bind(user.id).all();
  return json({ purchases: purchases.results || [], usage_grants: grants.results || [] });
}

async function verifyStorePurchase(request, env) {
  const user = await authenticateSession(request, env);
  const data = await requestJson(request);
  const productId = String(data.product_id || '');
  const evidence = String(data.store_evidence || '');
  if (!storeProduct(productId)) return json({ error: 'Unknown Microsoft Store product' }, 400);
  if (!evidence || evidence.length > 200000) return json({ error: 'Valid Store purchase evidence is required' }, 400);
  if (!env.MICROSOFT_STORE_VERIFIER_URL || !env.MICROSOFT_STORE_VERIFIER_TOKEN) {
    return json({
      error: 'Microsoft Store server verification is not configured',
      code: 'store_verification_unavailable',
    }, 503);
  }

  const verification = await fetch(env.MICROSOFT_STORE_VERIFIER_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.MICROSOFT_STORE_VERIFIER_TOKEN}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ product_id: productId, store_evidence: evidence, account_id: user.id }),
  });
  const result = await verification.json();
  if (!verification.ok || result.valid !== true || result.product_id !== productId || !result.transaction_id) {
    return json({ error: 'Microsoft Store could not verify this purchase', code: 'store_purchase_rejected' }, 400);
  }
  const product = storeProduct(productId);
  const now = Date.now();
  const eventId = `msp_${randomToken(18)}`;
  const evidenceHash = await sha256(evidence);
  const existing = await env.DB.prepare(
    'SELECT id, user_id FROM store_purchase_events WHERE store_transaction_id = ?',
  ).bind(String(result.transaction_id)).first();
  if (existing) {
    if (existing.user_id !== user.id) return json({ error: 'Purchase is already linked to another account' }, 409);
    return json({ ok: true, duplicate: true });
  }
  const statements = [
    env.DB.prepare(
      `INSERT INTO store_purchase_events
        (id, user_id, store_product_id, store_transaction_id, purchase_kind,
         verification_status, evidence_hash, verified_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'verified', ?, ?, ?, ?)`,
    ).bind(eventId, user.id, product.id, String(result.transaction_id), product.kind, evidenceHash, now, now, now),
  ];
  if (product.kind === 'consumable') {
    statements.push(env.DB.prepare(
      `INSERT INTO usage_grants
        (id, user_id, source_event_id, units, remaining_units, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, NULL, ?)`,
    ).bind(`grt_${randomToken(18)}`, user.id, eventId, product.grant_units, product.grant_units, now));
  } else {
    const periodEnd = Number(result.expires_at || 0);
    if (periodEnd <= now) return json({ error: 'Subscription has already expired' }, 400);
    statements.push(env.DB.prepare(
      `INSERT INTO account_entitlements
        (user_id, plan, status, monthly_units, requests_per_minute, device_limit,
         period_start, period_end, source, external_reference, created_at, updated_at)
       VALUES (?, 'plus', 'active', ?, 45, 5, ?, ?, 'microsoft_store', ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET plan = 'plus', status = 'active',
         monthly_units = excluded.monthly_units, requests_per_minute = excluded.requests_per_minute,
         device_limit = excluded.device_limit, period_start = excluded.period_start,
         period_end = excluded.period_end, source = 'microsoft_store',
         external_reference = excluded.external_reference, updated_at = excluded.updated_at`,
    ).bind(user.id, product.monthly_units, now, periodEnd, String(result.transaction_id), now, now));
  }
  await env.DB.batch(statements);
  return json({ ok: true, product_id: product.id, transaction_id: String(result.transaction_id) });
}

function ticketInput(data) {
  const category = String(data.category || '');
  const subject = String(data.subject || '').trim();
  const body = String(data.body || '').trim();
  if (!TICKET_CATEGORIES.has(category)) throw new Error('Choose a valid ticket category');
  if (subject.length < 5 || subject.length > 120) throw new Error('Subject must be 5 to 120 characters');
  if (body.length < 10 || body.length > 5000) throw new Error('Message must be 10 to 5000 characters');
  return { category, subject, body };
}

async function listTickets(request, env) {
  const user = await authenticateSession(request, env);
  const result = await env.DB.prepare(
    `SELECT id, category, subject, status, priority, created_at, updated_at, last_message_at
     FROM support_tickets
     WHERE user_id = ? AND user_archived_at IS NULL
     ORDER BY updated_at DESC LIMIT 100`,
  ).bind(user.id).all();
  return json({ tickets: result.results || [] });
}

async function createTicket(request, env) {
  const user = await authenticateSession(request, env);
  const input = ticketInput(await requestJson(request));
  const now = Date.now();
  const ticketId = `tkt_${randomToken(18)}`;
  const messageId = `msg_${randomToken(18)}`;
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO support_tickets
        (id, user_id, category, subject, created_at, updated_at, last_message_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(ticketId, user.id, input.category, input.subject, now, now, now),
    env.DB.prepare(
      `INSERT INTO support_messages
        (id, ticket_id, author_user_id, author_role, body, created_at)
       VALUES (?, ?, ?, 'user', ?, ?)`,
    ).bind(messageId, ticketId, user.id, input.body, now),
  ]);
  return json({ id: ticketId, status: 'open', created_at: now }, 201);
}

function userTicketIdFromPath(pathname) {
  return pathname.match(/^\/api\/tickets\/(tkt_[A-Za-z0-9_-]+)(?:\/(?:messages|close|archive))?$/)?.[1] || '';
}

function adminTicketIdFromPath(pathname) {
  return pathname.match(/^\/api\/admin\/tickets\/(tkt_[A-Za-z0-9_-]+)$/)?.[1] || '';
}

async function ticketDetail(request, env, ticketId) {
  const user = await authenticateSession(request, env);
  const ticket = await env.DB.prepare(
    `SELECT id, category, subject, status, priority, created_at, updated_at, last_message_at
     FROM support_tickets WHERE id = ? AND user_id = ?`,
  ).bind(ticketId, user.id).first();
  if (!ticket) return json({ error: 'Ticket not found' }, 404);
  const messages = await env.DB.prepare(
    `SELECT id, author_role, body, created_at
     FROM support_messages WHERE ticket_id = ? ORDER BY created_at ASC LIMIT 500`,
  ).bind(ticketId).all();
  return json({ ticket, messages: messages.results || [] });
}

async function replyTicket(request, env, ticketId) {
  const user = await authenticateSession(request, env);
  const data = await requestJson(request);
  const body = String(data.body || '').trim();
  if (body.length < 1 || body.length > 5000) return json({ error: 'Message must be 1 to 5000 characters' }, 400);
  const ticket = await env.DB.prepare(
    'SELECT id, status FROM support_tickets WHERE id = ? AND user_id = ?',
  ).bind(ticketId, user.id).first();
  if (!ticket) return json({ error: 'Ticket not found' }, 404);
  if (ticket.status === 'closed') return json({ error: 'Ticket is closed' }, 409);
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO support_messages
        (id, ticket_id, author_user_id, author_role, body, created_at)
       VALUES (?, ?, ?, 'user', ?, ?)`,
    ).bind(`msg_${randomToken(18)}`, ticketId, user.id, body, now),
    env.DB.prepare(
      `UPDATE support_tickets
       SET status = 'open', updated_at = ?, last_message_at = ?
       WHERE id = ? AND user_id = ?`,
    ).bind(now, now, ticketId, user.id),
  ]);
  return json({ ok: true, created_at: now }, 201);
}

async function closeTicket(request, env, ticketId) {
  const user = await authenticateSession(request, env);
  const ticket = await env.DB.prepare(
    'SELECT id, status FROM support_tickets WHERE id = ? AND user_id = ?',
  ).bind(ticketId, user.id).first();
  if (!ticket) return json({ error: 'Ticket not found' }, 404);
  if (ticket.status === 'closed') return json({ ok: true, status: 'closed', duplicate: true });
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE support_tickets
       SET status = 'closed', updated_at = ?, last_message_at = ?, closed_at = ?
       WHERE id = ? AND user_id = ?`,
    ).bind(now, now, now, ticketId, user.id),
    env.DB.prepare(
      `INSERT INTO support_messages
        (id, ticket_id, author_user_id, author_role, body, created_at)
       VALUES (?, ?, ?, 'system', 'Ticket closed by user.', ?)`,
    ).bind(`msg_${randomToken(18)}`, ticketId, user.id, now),
  ]);
  return json({ ok: true, status: 'closed', updated_at: now });
}

async function archiveTicket(request, env, ticketId) {
  const user = await authenticateSession(request, env);
  const ticket = await env.DB.prepare(
    'SELECT id, status FROM support_tickets WHERE id = ? AND user_id = ?',
  ).bind(ticketId, user.id).first();
  if (!ticket) return json({ error: 'Ticket not found' }, 404);
  if (!['resolved', 'closed'].includes(ticket.status)) {
    return json({ error: 'Only resolved or closed tickets can be removed from your list' }, 409);
  }
  const now = Date.now();
  await env.DB.prepare(
    `UPDATE support_tickets SET user_archived_at = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`,
  ).bind(now, now, ticketId, user.id).run();
  return json({ ok: true, archived_at: now });
}

function adminIdentity(request, env) {
  const accessEmail = normalizeEmail(request.headers.get('cf-access-authenticated-user-email'));
  const allowed = new Set(String(env.ADMIN_EMAILS || '').split(',').map(normalizeEmail).filter(Boolean));
  if (accessEmail && allowed.has(accessEmail)) return accessEmail;
  if (String(env.ENVIRONMENT || '').toLowerCase() !== 'production') {
    const supplied = request.headers.get('x-admin-secret') || '';
    if (env.LOCAL_ADMIN_SECRET && supplied === env.LOCAL_ADMIN_SECRET) return 'local-admin';
  }
  return '';
}

function adminUserIdFromPath(pathname) {
  return pathname.match(/^\/api\/admin\/users\/(usr_[A-Za-z0-9_-]+)$/)?.[1] || '';
}

async function adminUsers(request, env) {
  const actor = adminIdentity(request, env);
  if (!actor) return json({ error: 'Administrator access required' }, 403);
  const search = String(new URL(request.url).searchParams.get('q') || '').trim().slice(0, 120);
  const result = await env.DB.prepare(
    `SELECT u.id, u.email, u.status, u.role, u.created_at, u.last_login_at,
            e.plan, e.status AS entitlement_status, e.monthly_units,
            e.requests_per_minute, e.device_limit, e.period_end,
            (SELECT COUNT(*) FROM support_tickets t WHERE t.user_id = u.id) AS ticket_count,
            (SELECT COUNT(*) FROM user_sessions s
             WHERE s.user_id = u.id AND s.revoked_at IS NULL AND s.expires_at > ?) AS active_sessions
     FROM users u LEFT JOIN account_entitlements e ON e.user_id = u.id
     WHERE (? = '' OR u.email LIKE ? OR u.id = ?)
     ORDER BY u.created_at DESC LIMIT 100`,
  ).bind(Date.now(), search, `%${search}%`, search).all();
  const users = result.results || [];
  if (env.SUBSCRIPTION_GUARD) {
    await Promise.all(users.map(async user => {
      try {
        const id = env.SUBSCRIPTION_GUARD.idFromName(user.id);
        const response = await env.SUBSCRIPTION_GUARD.get(id).fetch('https://guard.internal/inspect', {
          method: 'POST',
          body: JSON.stringify({ action: 'inspect' }),
        });
        const state = await response.json();
        user.used_units = Number(state.usage?.units || 0);
        user.usage_month = String(state.usage?.month || '');
      } catch {
        user.used_units = null;
        user.usage_month = '';
      }
    }));
  }
  return json({ users });
}

async function updateAdminUser(request, env, userId) {
  const actor = adminIdentity(request, env);
  if (!actor) return json({ error: 'Administrator access required' }, 403);
  const data = await requestJson(request);
  const status = String(data.status || '');
  const plan = String(data.plan || '');
  const monthlyUnits = Number(data.monthly_units);
  const rpm = Number(data.requests_per_minute);
  const deviceLimit = Number(data.device_limit);
  if (!['active', 'suspended'].includes(status)) return json({ error: 'Invalid user status' }, 400);
  if (!['beta', 'plus', 'pro'].includes(plan)) return json({ error: 'Invalid plan' }, 400);
  if (!Number.isInteger(monthlyUnits) || monthlyUnits < 0 || monthlyUnits > 100000) return json({ error: 'Monthly units must be between 0 and 100000' }, 400);
  if (!Number.isInteger(rpm) || rpm < 1 || rpm > 180) return json({ error: 'Requests per minute must be between 1 and 180' }, 400);
  if (!Number.isInteger(deviceLimit) || deviceLimit < 1 || deviceLimit > 10) return json({ error: 'Device limit must be between 1 and 10' }, 400);
  const user = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first();
  if (!user) return json({ error: 'User not found' }, 404);
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?').bind(status, now, userId),
    env.DB.prepare(
      `UPDATE account_entitlements
       SET plan = ?, status = 'active', monthly_units = ?, requests_per_minute = ?,
           device_limit = ?, source = 'support', updated_at = ?
       WHERE user_id = ?`,
    ).bind(plan, monthlyUnits, rpm, deviceLimit, now, userId),
    env.DB.prepare(
      `INSERT INTO admin_audit (actor, action, target, outcome, source_ip, created_at)
       VALUES (?, 'user.policy.update', ?, 'success', ?, ?)`,
    ).bind(actor, userId, sourceIp(request), now),
  ]);
  return json({ ok: true, updated_at: now });
}

async function adminModelProviders(request, env) {
  const actor = adminIdentity(request, env);
  if (!actor) return json({ error: 'Administrator access required' }, 403);
  const providers = publicModelProviders(env);
  const activeProvider = await activeModelProviderId(env);
  if (request.method === 'GET') {
    return json({ active_provider: activeProvider, providers, catalog: publicProviderCatalog() });
  }
  const data = await requestJson(request);
  const providerId = String(data.provider_id || '');
  const provider = providers.find(item => item.id === providerId);
  if (!provider) return json({ error: 'Unknown model provider' }, 400);
  if (!provider.configured) return json({ error: 'Configure this provider in Worker Secrets before activating it' }, 409);
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO platform_settings (key, value, updated_by, updated_at)
       VALUES ('active_model_provider', ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value,
         updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
    ).bind(providerId, actor, now),
    env.DB.prepare(
      `INSERT INTO admin_audit (actor, action, target, outcome, source_ip, created_at)
       VALUES (?, 'model_provider.activate', ?, 'success', ?, ?)`,
    ).bind(actor, providerId, sourceIp(request), now),
  ]);
  return json({ ok: true, active_provider: providerId });
}

async function listAdminOrders(request, env) {
  const actor = adminIdentity(request, env);
  if (!actor) return json({ error: 'Administrator access required' }, 403);
  const result = await env.DB.prepare(
    `SELECT e.id, e.user_id, u.email, e.store_product_id, e.store_transaction_id,
            e.purchase_kind, e.verification_status, e.verified_at,
            e.created_at, e.updated_at
     FROM store_purchase_events e JOIN users u ON u.id = e.user_id
     ORDER BY e.created_at DESC LIMIT 100`,
  ).all();
  return json({ orders: result.results || [] });
}

async function listAdminAudit(request, env) {
  const actor = adminIdentity(request, env);
  if (!actor) return json({ error: 'Administrator access required' }, 403);
  const result = await env.DB.prepare(
    `SELECT id, actor, action, target, outcome, source_ip, created_at
     FROM admin_audit ORDER BY created_at DESC LIMIT 100`,
  ).all();
  return json({ events: result.results || [] });
}

async function listAdminTickets(request, env) {
  const actor = adminIdentity(request, env);
  if (!actor) return json({ error: 'Administrator access required' }, 403);
  const url = new URL(request.url);
  const status = url.searchParams.get('status') || '';
  const search = String(url.searchParams.get('q') || '').trim().slice(0, 120);
  const conditions = [];
  const values = [];
  if (status && TICKET_STATUSES.has(status)) {
    conditions.push('t.status = ?');
    values.push(status);
  }
  if (search) {
    conditions.push('(t.subject LIKE ? OR u.email LIKE ? OR t.id = ?)');
    values.push(`%${search}%`, `%${search}%`, search);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await env.DB.prepare(
    `SELECT t.id, t.category, t.subject, t.status, t.priority, t.assigned_admin,
            t.created_at, t.updated_at, t.last_message_at, u.email
     FROM support_tickets t JOIN users u ON u.id = t.user_id
     ${where} ORDER BY t.updated_at DESC LIMIT 200`,
  ).bind(...values).all();
  return json({ tickets: result.results || [] });
}

async function updateAdminTicket(request, env, ticketId) {
  const actor = adminIdentity(request, env);
  if (!actor) return json({ error: 'Administrator access required' }, 403);
  const data = await requestJson(request);
  const status = String(data.status || '');
  const priority = String(data.priority || '');
  const message = String(data.message || '').trim();
  if (status && !TICKET_STATUSES.has(status)) return json({ error: 'Invalid ticket status' }, 400);
  if (priority && !TICKET_PRIORITIES.has(priority)) return json({ error: 'Invalid ticket priority' }, 400);
  if (message.length > 5000) return json({ error: 'Message is too long' }, 400);
  const ticket = await env.DB.prepare('SELECT id, status FROM support_tickets WHERE id = ?').bind(ticketId).first();
  if (!ticket) return json({ error: 'Ticket not found' }, 404);
  const nextStatus = status || ticket.status;
  if (message && nextStatus === 'closed') {
    return json({ error: 'Reopen the ticket before replying' }, 409);
  }

  const now = Date.now();
  const statements = [
    env.DB.prepare(
      `UPDATE support_tickets
       SET status = COALESCE(NULLIF(?, ''), status),
           priority = COALESCE(NULLIF(?, ''), priority),
           assigned_admin = ?,
           updated_at = ?,
           last_message_at = CASE WHEN ? <> '' THEN ? ELSE last_message_at END,
           closed_at = CASE
             WHEN ? = 'closed' THEN ?
             WHEN ? <> '' AND ? <> 'closed' THEN NULL
             ELSE closed_at
           END
       WHERE id = ?`,
    ).bind(status, priority, actor, now, message, now, status, now, status, status, ticketId),
    env.DB.prepare(
      `INSERT INTO admin_audit (actor, action, target, outcome, source_ip, created_at)
       VALUES (?, 'ticket.update', ?, 'success', ?, ?)`,
    ).bind(actor, ticketId, sourceIp(request), now),
  ];
  if (message) {
    statements.push(env.DB.prepare(
      `INSERT INTO support_messages
        (id, ticket_id, author_role, body, created_at)
       VALUES (?, ?, 'support', ?, ?)`,
    ).bind(`msg_${randomToken(18)}`, ticketId, message, now));
  }
  await env.DB.batch(statements);
  return json({ ok: true, updated_at: now });
}

async function adminTicketDetail(request, env, ticketId) {
  const actor = adminIdentity(request, env);
  if (!actor) return json({ error: 'Administrator access required' }, 403);
  const ticket = await env.DB.prepare(
    `SELECT t.id, t.category, t.subject, t.status, t.priority, t.assigned_admin,
            t.created_at, t.updated_at, t.last_message_at, u.email
     FROM support_tickets t JOIN users u ON u.id = t.user_id
     WHERE t.id = ?`,
  ).bind(ticketId).first();
  if (!ticket) return json({ error: 'Ticket not found' }, 404);
  const messages = await env.DB.prepare(
    `SELECT id, author_role, body, created_at
     FROM support_messages WHERE ticket_id = ? ORDER BY created_at ASC LIMIT 500`,
  ).bind(ticketId).all();
  return json({ ticket, messages: messages.results || [] });
}

export async function accountApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  try {
    if (path === '/api/auth/config' && request.method === 'GET') {
      return json({ turnstile_site_key: String(env.TURNSTILE_SITE_KEY || '') });
    }
    if (path === '/api/auth/request-code' && request.method === 'POST') return await requestLoginCode(request, env);
    if (path === '/api/auth/verify-code' && request.method === 'POST') return await verifyLoginCode(request, env);
    if (path === '/api/auth/logout' && request.method === 'POST') return await logout(request, env);
    if (path === '/api/account' && request.method === 'GET') return await accountProfile(request, env);
    if (path === '/api/store/products' && request.method === 'GET') return await storeProducts(request, env);
    if (path === '/api/store/entitlements' && request.method === 'GET') return await storeEntitlements(request, env);
    if (path === '/api/store/purchases/verify' && request.method === 'POST') return await verifyStorePurchase(request, env);
    if (path === '/api/tickets' && request.method === 'GET') return await listTickets(request, env);
    if (path === '/api/tickets' && request.method === 'POST') return await createTicket(request, env);
    if (path === '/api/admin/tickets' && request.method === 'GET') return await listAdminTickets(request, env);
    if (path === '/api/admin/users' && request.method === 'GET') return await adminUsers(request, env);
    if (path === '/api/admin/orders' && request.method === 'GET') return await listAdminOrders(request, env);
    if (path === '/api/admin/audit' && request.method === 'GET') return await listAdminAudit(request, env);
    if (path === '/api/admin/model-providers' && ['GET', 'PATCH'].includes(request.method)) {
      return await adminModelProviders(request, env);
    }

    const userTicketId = userTicketIdFromPath(path);
    if (userTicketId && path.endsWith('/messages') && request.method === 'POST') {
      return await replyTicket(request, env, userTicketId);
    }
    if (userTicketId && path.endsWith('/close') && request.method === 'POST') {
      return await closeTicket(request, env, userTicketId);
    }
    if (userTicketId && path.endsWith('/archive') && request.method === 'POST') {
      return await archiveTicket(request, env, userTicketId);
    }
    if (userTicketId && request.method === 'GET') return await ticketDetail(request, env, userTicketId);
    const adminTicketId = adminTicketIdFromPath(path);
    if (adminTicketId && request.method === 'GET') {
      return await adminTicketDetail(request, env, adminTicketId);
    }
    if (adminTicketId && request.method === 'PATCH') {
      return await updateAdminTicket(request, env, adminTicketId);
    }
    const adminUserId = adminUserIdFromPath(path);
    if (adminUserId && request.method === 'PATCH') return await updateAdminUser(request, env, adminUserId);
    return null;
  } catch (error) {
    const message = error?.message || 'Request failed';
    const authError = /sign-in|required|session expired/i.test(message);
    return json({ error: message, code: authError ? 'authentication_required' : 'request_failed' }, authError ? 401 : 400);
  }
}
