const encoder = new TextEncoder();
const ROUTE_UNITS = {
  "/api/complete": 1,
  "/api/complete-stream": 1,
  "/api/assist": 4,
  "/api/chat": 5,
  "/api/review": 7,
};

function decodeBase64Url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), character => character.charCodeAt(0));
}

function decodeJson(value) {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value)));
}

function signingKeys(env) {
  const keys = JSON.parse(env.SUBSCRIPTION_SIGNING_KEYS || "{}");
  if (!keys || Array.isArray(keys) || typeof keys !== "object") throw new Error("Signing keys are not configured");
  return keys;
}

function encodeBase64Url(value) {
  const bytes = typeof value === "string" ? encoder.encode(value) : encoder.encode(JSON.stringify(value));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function signSubscriptionToken(claims, env) {
  const keys = signingKeys(env);
  const kid = env.SUBSCRIPTION_ACTIVE_KID;
  const secret = keys[kid];
  if (!kid || typeof secret !== "string" || secret.length < 32) throw new Error("Active signing key is not configured");
  const header = encodeBase64Url({ alg: "HS256", typ: "JWT", kid });
  const payload = encodeBase64Url(claims);
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`${header}.${payload}`));
  let binary = "";
  for (const byte of new Uint8Array(signature)) binary += String.fromCharCode(byte);
  const encodedSignature = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${header}.${payload}.${encodedSignature}`;
}

export async function verifySubscriptionToken(token, env, now = Math.floor(Date.now() / 1000)) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw new Error("Invalid subscription token");
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJson(encodedHeader);
  const claims = decodeJson(encodedPayload);
  if (header.alg !== "HS256" || typeof header.kid !== "string") throw new Error("Unsupported subscription token");
  const secret = signingKeys(env)[header.kid];
  if (typeof secret !== "string" || secret.length < 32) throw new Error("Unknown signing key");
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    decodeBase64Url(encodedSignature),
    encoder.encode(`${encodedHeader}.${encodedPayload}`),
  );
  if (!valid) throw new Error("Invalid subscription token");
  if (claims.iss !== "en-intellisense" || claims.aud !== "en-intellisense-api") throw new Error("Invalid token audience");
  if (typeof claims.sub !== "string" || !/^[A-Za-z0-9:_-]{3,128}$/.test(claims.sub)) throw new Error("Invalid subscriber");
  if (!Number.isInteger(claims.iat) || !Number.isInteger(claims.exp) || claims.exp <= now - 30 || claims.iat > now + 30) {
    throw new Error("Subscription token expired");
  }
  if (!["standard", "pro"].includes(claims.plan)) throw new Error("Invalid subscription plan");
  return claims;
}

export function subscriptionLimits(claims) {
  const defaults = claims.plan === "pro"
    ? { monthlyUnits: 30000, requestsPerMinute: 90, devices: 5 }
    : { monthlyUnits: 10000, requestsPerMinute: 45, devices: 3 };
  return {
    monthlyUnits: Math.min(Math.max(Number(claims.monthly_units) || defaults.monthlyUnits, 100), 100000),
    requestsPerMinute: Math.min(Math.max(Number(claims.rpm) || defaults.requestsPerMinute, 5), 180),
    devices: Math.min(Math.max(Number(claims.devices) || defaults.devices, 1), 10),
  };
}

function monthKey(now) {
  return new Date(now).toISOString().slice(0, 7);
}

export class SubscriptionGuard {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    const input = await request.json();
    if (input.action === "admin-attempt") {
      const now = Date.now();
      const attempts = ((await this.state.storage.get("admin-rate")) || [])
        .filter(timestamp => timestamp > now - 60000);
      if (attempts.length >= 12) {
        return Response.json({ error: "Too many admin requests" }, { status: 429 });
      }
      attempts.push(now);
      await this.state.storage.put("admin-rate", attempts);
      return Response.json({ ok: true });
    }
    if (input.action === "set-status") {
      await this.state.storage.put("status", {
        active: Boolean(input.active),
        reason: String(input.reason || "").slice(0, 160),
        updatedAt: Date.now(),
      });
      return Response.json({ ok: true });
    }
    if (input.action === "inspect") {
      const status = await this.state.storage.get("status");
      const usage = await this.state.storage.get("usage");
      if (status && !status.active) {
        return Response.json({ error: "Subscription inactive", code: "subscription_inactive" }, { status: 403 });
      }
      return Response.json({ ok: true, usage: usage || null });
    }
    if (!["consume", "authorize-grant"].includes(input.action)) {
      return Response.json({ error: "Invalid guard action" }, { status: 400 });
    }

    const status = await this.state.storage.get("status");
    if (status && !status.active) return Response.json({ error: "Subscription inactive", code: "subscription_inactive" }, { status: 403 });

    const now = Date.now();
    const claims = input.claims || {};
    const limits = subscriptionLimits(claims);
    const route = String(input.route || "");
    const units = ROUTE_UNITS[route];
    if (!units) return Response.json({ error: "Unsupported operation" }, { status: 400 });

    const rate = (await this.state.storage.get("rate")) || [];
    const recent = rate.filter(timestamp => timestamp > now - 60000);
    if (recent.length >= limits.requestsPerMinute) {
      return Response.json({ error: "Too many requests", code: "rate_limited", retry_after: 60 }, { status: 429 });
    }

    const device = String(input.device || "unknown").slice(0, 128);
    const devices = (await this.state.storage.get("devices")) || {};
    for (const [id, lastSeen] of Object.entries(devices)) {
      if (lastSeen < now - 35 * 86400000) delete devices[id];
    }
    if (!devices[device] && Object.keys(devices).length >= limits.devices) {
      return Response.json({ error: "Device limit reached", code: "device_limit" }, { status: 403 });
    }

    if (input.action === "authorize-grant") {
      recent.push(now);
      devices[device] = now;
      await this.state.storage.put({ rate: recent, devices });
      return Response.json({ ok: true, plan: claims.plan });
    }

    const currentMonth = monthKey(now);
    let usage = (await this.state.storage.get("usage")) || { month: currentMonth, units: 0 };
    if (usage.month !== currentMonth) usage = { month: currentMonth, units: 0 };
    if (usage.units + units > limits.monthlyUnits) {
      return Response.json({ error: "Monthly AI allowance used", code: "quota_exceeded" }, { status: 402 });
    }

    recent.push(now);
    devices[device] = now;
    usage.units += units;
    await this.state.storage.put({ rate: recent, devices, usage });
    return Response.json({
      ok: true,
      plan: claims.plan,
      usage: { units: usage.units, limit: limits.monthlyUnits, month: currentMonth },
    });
  }
}

export async function authorizeSubscription(request, env, route) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) throw new Error("Subscription sign-in required");
  const claims = await verifySubscriptionToken(authorization.slice(7), env);
  if (!env.SUBSCRIPTION_GUARD) throw new Error("Subscription guard is not configured");
  const device = request.headers.get("x-enwrite-device") || request.headers.get("cf-connecting-ip") || "unknown";
  const id = env.SUBSCRIPTION_GUARD.idFromName(claims.sub);
  const response = await env.SUBSCRIPTION_GUARD.get(id).fetch("https://guard.internal/consume", {
    method: "POST",
    body: JSON.stringify({ action: "consume", claims, route, device }),
  });
  const result = await response.json();
  return { response, result, claims };
}
