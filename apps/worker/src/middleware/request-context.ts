import { createMiddleware } from 'hono/factory';
import type { WorkerAppEnv } from '../bindings';

export const requestContext = createMiddleware<WorkerAppEnv>(async (context, next) => {
  const incomingId = context.req.header('x-request-id');
  const requestId = incomingId && /^[A-Za-z0-9._:-]{1,96}$/.test(incomingId)
    ? incomingId
    : crypto.randomUUID();

  context.set('requestId', requestId);
  await next();
  context.header('x-request-id', requestId);
});
