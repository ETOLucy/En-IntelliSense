import assert from 'node:assert/strict';
import { accountApi, consumeAccountUsage, normalizeEmail } from '../src/cloud/account-service.js';

assert.equal(normalizeEmail('  Learner@Example.COM '), 'learner@example.com');
assert.equal(normalizeEmail('not-an-email'), '');
assert.equal(normalizeEmail('a@b'), '');

class FakeStatement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    this.database.calls.push({ sql: this.sql, values });
    return this;
  }

  async first() {
    if (this.sql.includes('FROM user_sessions')) {
      return {
        session_id: 'session-a',
        user_id: 'user-a',
        expires_at: Date.now() + 60000,
        last_seen_at: Date.now(),
        email: 'a@example.com',
        status: 'active',
        role: 'user',
      };
    }
    if (this.sql.includes('FROM support_tickets WHERE id = ? AND user_id = ?')) {
      if (['tkt_owned', 'tkt_closed'].includes(this.values[0]) && this.values[1] === 'user-a') {
        return {
          id: this.values[0],
          category: 'technical',
          subject: 'Owned ticket',
          status: this.values[0] === 'tkt_closed' ? 'closed' : 'open',
          priority: 'normal',
          created_at: Date.now(),
          updated_at: Date.now(),
          last_message_at: Date.now(),
        };
      }
      return null;
    }
    return null;
  }

  async all() {
    return { results: [] };
  }

  async run() {
    return { success: true };
  }
}

class FakeDatabase {
  constructor() {
    this.calls = [];
  }

  prepare(sql) {
    return new FakeStatement(this, sql);
  }

  async batch(statements) {
    for (const statement of statements) await statement.run();
    return statements.map(() => ({ success: true }));
  }
}

const env = {
  DB: new FakeDatabase(),
  ACCOUNT_HASH_PEPPER: 'test-pepper-that-is-longer-than-thirty-two-characters',
};
const ownedResponse = await accountApi(new Request('https://service.example/api/tickets/tkt_owned', {
  headers: { authorization: 'Bearer session-token' },
}), env);
assert.equal(ownedResponse.status, 200);

const otherResponse = await accountApi(new Request('https://service.example/api/tickets/tkt_other', {
  headers: { authorization: 'Bearer session-token' },
}), env);
assert.equal(otherResponse.status, 404);
assert.ok(env.DB.calls.some(call =>
  call.sql.includes('FROM support_tickets WHERE id = ? AND user_id = ?')
  && call.values[0] === 'tkt_other'
  && call.values[1] === 'user-a'
));

const closeResponse = await accountApi(new Request('https://service.example/api/tickets/tkt_owned/close', {
  method: 'POST',
  headers: {
    authorization: 'Bearer session-token',
    'content-type': 'application/json',
  },
  body: '{}',
}), env);
assert.equal(closeResponse.status, 200);
assert.equal((await closeResponse.json()).status, 'closed');
assert.ok(env.DB.calls.some(call =>
  call.sql.includes("SET status = 'closed'")
  && call.values.at(-2) === 'tkt_owned'
  && call.values.at(-1) === 'user-a'
));

const archiveResponse = await accountApi(new Request('https://service.example/api/tickets/tkt_closed/archive', {
  method: 'POST',
  headers: {
    authorization: 'Bearer session-token',
    'content-type': 'application/json',
  },
  body: '{}',
}), env);
assert.equal(archiveResponse.status, 200);
assert.ok(env.DB.calls.some(call =>
  call.sql.includes('SET user_archived_at = ?')
  && call.values.at(-2) === 'tkt_closed'
  && call.values.at(-1) === 'user-a'
));

const noTokenResponse = await accountApi(new Request('https://service.example/api/tickets'), env);
assert.equal(noTokenResponse.status, 401);

const adminEnv = {
  ...env,
  ENVIRONMENT: 'development',
  LOCAL_ADMIN_SECRET: 'test-admin-secret',
};
for (const endpoint of ['/api/admin/orders', '/api/admin/audit']) {
  const denied = await accountApi(new Request(`https://service.example${endpoint}`), adminEnv);
  assert.equal(denied.status, 403);
  const allowed = await accountApi(new Request(`https://service.example${endpoint}`, {
    headers: { 'x-admin-secret': 'test-admin-secret' },
  }), adminEnv);
  assert.equal(allowed.status, 200);
  const payload = await allowed.json();
  assert.ok(Array.isArray(endpoint.endsWith('/orders') ? payload.orders : payload.events));
}
const riskResponse = await accountApi(new Request('https://service.example/api/admin/risk-summary', {
  headers: { 'x-admin-secret': 'test-admin-secret' },
}), adminEnv);
assert.equal(riskResponse.status, 200);
const riskPayload = await riskResponse.json();
assert.equal(riskPayload.window_hours, 24);
assert.equal(typeof riskPayload.suspicious_sources, 'number');

class UsageStatement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    this.database.calls.push({ sql: this.sql, values });
    return this;
  }

  async first() {
    if (this.sql.includes('FROM usage_grants')) {
      const [userId, requiredUnits, now] = this.values;
      return this.database.grants
        .filter(grant =>
          grant.user_id === userId
          && grant.remaining_units >= requiredUnits
          && (grant.expires_at === null || grant.expires_at > now))
        .sort((left, right) => {
          if (left.expires_at === null && right.expires_at !== null) return 1;
          if (left.expires_at !== null && right.expires_at === null) return -1;
          return (left.expires_at ?? 0) - (right.expires_at ?? 0)
            || left.created_at - right.created_at;
        })
        .map(grant => ({ id: grant.id }))[0] || null;
    }
    if (this.sql.includes('FROM account_entitlements')) return this.database.entitlement;
    return null;
  }

  async run() {
    if (!this.sql.includes('UPDATE usage_grants')) return { success: true, meta: { changes: 0 } };
    const [units, grantId, userId, requiredUnits, now] = this.values;
    const grant = this.database.grants.find(item =>
      item.id === grantId
      && item.user_id === userId
      && item.remaining_units >= requiredUnits
      && (item.expires_at === null || item.expires_at > now));
    if (!grant) return { success: true, meta: { changes: 0 } };
    grant.remaining_units -= units;
    return { success: true, meta: { changes: 1 } };
  }
}

class UsageDatabase {
  constructor({ grants = [], entitlement = null } = {}) {
    this.calls = [];
    this.grants = grants;
    this.entitlement = entitlement;
  }

  prepare(sql) {
    return new UsageStatement(this, sql);
  }
}

function usageGuard() {
  const calls = [];
  return {
    calls,
    idFromName(userId) {
      return userId;
    },
    get(userId) {
      return {
        fetch: async (url, init) => {
          calls.push({ userId, url, input: JSON.parse(init.body) });
          return Response.json({ ok: true });
        },
      };
    },
  };
}

const usageUser = { id: 'user-a' };
const usageRequest = new Request('https://service.example/api/review');
const activeGrantDb = new UsageDatabase({
  grants: [
    { id: 'never', user_id: 'user-a', remaining_units: 20, expires_at: null, created_at: 1 },
    { id: 'later', user_id: 'user-a', remaining_units: 20, expires_at: Date.now() + 60000, created_at: 2 },
    { id: 'sooner', user_id: 'user-a', remaining_units: 20, expires_at: Date.now() + 30000, created_at: 3 },
  ],
});
const activeGrantGuard = usageGuard();
assert.equal(await consumeAccountUsage(usageRequest, {
  DB: activeGrantDb,
  SUBSCRIPTION_GUARD: activeGrantGuard,
}, usageUser, '/api/review'), null);
assert.equal(activeGrantDb.grants.find(grant => grant.id === 'sooner').remaining_units, 13);
assert.equal(activeGrantDb.grants.find(grant => grant.id === 'later').remaining_units, 20);
assert.equal(activeGrantGuard.calls.length, 1);
assert.equal(activeGrantGuard.calls[0].input.action, 'authorize-grant');
assert.ok(activeGrantDb.calls.some(call =>
  call.sql.includes('ORDER BY CASE WHEN expires_at IS NULL THEN 1 ELSE 0 END')
));

const expiredGrantDb = new UsageDatabase({
  grants: [
    { id: 'expired', user_id: 'user-a', remaining_units: 20, expires_at: Date.now() - 1, created_at: 1 },
  ],
  entitlement: {
    plan: 'plus',
    status: 'active',
    monthly_units: 3000,
    requests_per_minute: 45,
    device_limit: 5,
    period_end: Date.now() + 60000,
  },
});
const monthlyGuard = usageGuard();
assert.equal(await consumeAccountUsage(usageRequest, {
  DB: expiredGrantDb,
  SUBSCRIPTION_GUARD: monthlyGuard,
}, usageUser, '/api/review'), null);
assert.equal(expiredGrantDb.grants[0].remaining_units, 20);
assert.equal(monthlyGuard.calls.length, 1);
assert.equal(monthlyGuard.calls[0].input.route, '/api/review');

console.log('Account isolation tests passed');
