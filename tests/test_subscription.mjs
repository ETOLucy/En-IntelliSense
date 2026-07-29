import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { signSubscriptionToken, SubscriptionGuard, subscriptionLimits, verifySubscriptionToken } from "../src/cloud/subscription-guard.js";

const secret = "test-secret-that-is-longer-than-thirty-two-characters";
const now = 2_000_000_000;
const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
const header = encode({ alg: "HS256", typ: "JWT", kid: "test" });
const payload = encode({
  iss: "en-intellisense",
  aud: "en-intellisense-api",
  sub: "subscriber_123",
  plan: "standard",
  iat: now - 10,
  exp: now + 3600,
});
const signature = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
const token = `${header}.${payload}.${signature}`;

const claims = await verifySubscriptionToken(token, {
  SUBSCRIPTION_SIGNING_KEYS: JSON.stringify({ test: secret }),
}, now);
assert.equal(claims.sub, "subscriber_123");
assert.deepEqual(subscriptionLimits(claims), { monthlyUnits: 10000, requestsPerMinute: 45, devices: 3 });
const signedByWorker = await signSubscriptionToken({
  iss: "en-intellisense", aud: "en-intellisense-api", sub: "subscriber_456",
  plan: "pro", iat: now, exp: now + 3600,
}, {
  SUBSCRIPTION_ACTIVE_KID: "test",
  SUBSCRIPTION_SIGNING_KEYS: JSON.stringify({ test: secret }),
});
assert.equal((await verifySubscriptionToken(signedByWorker, {
  SUBSCRIPTION_SIGNING_KEYS: JSON.stringify({ test: secret }),
}, now)).plan, "pro");

await assert.rejects(
  verifySubscriptionToken(`${header}.${payload}.invalid`, { SUBSCRIPTION_SIGNING_KEYS: JSON.stringify({ test: secret }) }, now),
  /Invalid subscription token/,
);
await assert.rejects(
  verifySubscriptionToken(token, { SUBSCRIPTION_SIGNING_KEYS: JSON.stringify({ test: secret }) }, now + 7200),
  /expired/,
);

class MemoryStorage {
  constructor() { this.values = new Map(); }
  async get(key) { return this.values.get(key); }
  async put(key, value) {
    if (typeof key === "object") {
      for (const [name, item] of Object.entries(key)) this.values.set(name, item);
    } else this.values.set(key, value);
  }
}

const guard = new SubscriptionGuard({ storage: new MemoryStorage() });
const inspectActive = await guard.fetch(new Request("https://guard.internal", {
  method: "POST",
  body: JSON.stringify({ action: "inspect" }),
}));
assert.equal(inspectActive.status, 200);
await guard.fetch(new Request("https://guard.internal", {
  method: "POST",
  body: JSON.stringify({ action: "set-status", active: false, reason: "refund" }),
}));
const inspectRevoked = await guard.fetch(new Request("https://guard.internal", {
  method: "POST",
  body: JSON.stringify({ action: "inspect" }),
}));
assert.equal(inspectRevoked.status, 403);
assert.equal((await inspectRevoked.json()).code, "subscription_inactive");

console.log("Subscription security tests passed");
