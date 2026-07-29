import { describe, expect, it } from 'vitest';
import { createApp } from '../../apps/worker/src/app';

describe('Hono worker entry', () => {
  it('owns the health route without exposing bindings', async () => {
    const response = await createApp().request('/api/health', {
      headers: { 'x-request-id': 'test-request-42' },
    }, {
      ENVIRONMENT: 'test',
      MARKET: 'cn',
      OPENAI_API_KEY: 'must-not-be-returned',
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('x-request-id')).toBe('test-request-42');
    await expect(response.json()).resolves.toEqual({
      service: 'writemelo-api',
      status: 'ok',
      architecture: 'hono-modular-monolith',
      environment: 'test',
      market: 'cn',
      request_id: 'test-request-42',
    });
  });

  it('replaces an invalid incoming request ID', async () => {
    const response = await createApp().request('/api/health', {
      headers: { 'x-request-id': 'invalid request id' },
    }, {});

    expect(response.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('delegates routes that have not migrated yet', async () => {
    const response = await createApp().request('/api/not-migrated', {}, {
      ENVIRONMENT: 'test',
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: 'No model provider is configured',
    });
  });
});
