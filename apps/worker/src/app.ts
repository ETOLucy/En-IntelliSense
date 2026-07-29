import { Hono } from 'hono';
import type { WorkerAppEnv } from './bindings';
import { dispatchLegacy } from './legacy-adapter';
import { requestContext } from './middleware/request-context';
import { healthRoutes } from './routes/health';

export function createApp() {
  const app = new Hono<WorkerAppEnv>();

  app.use('*', requestContext);
  app.route('/api/health', healthRoutes);

  // Existing behavior stays behind one boundary while routes migrate module by module.
  app.all('*', context => dispatchLegacy(
    context.req.raw,
    context.env,
  ));

  return app;
}
