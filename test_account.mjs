import assert from 'node:assert/strict';
import { accountApi, normalizeEmail } from './account-service.js';

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

console.log('Account isolation tests passed');
