import { Hono } from 'hono';
import type { WorkerAppEnv } from '../bindings';

export const healthRoutes = new Hono<WorkerAppEnv>();

healthRoutes.get('/', context => context.json({
  service: 'writemelo-api',
  status: 'ok',
  architecture: 'hono-modular-monolith',
  environment: String(context.env.ENVIRONMENT || 'unknown'),
  market: String(context.env.MARKET || 'unassigned'),
  request_id: context.get('requestId'),
}));
