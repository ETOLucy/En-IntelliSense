import legacyWorker from '../../../worker.js';
import type { WorkerBindings } from './bindings';

type LegacyWorker = {
  fetch(request: Request, env: WorkerBindings): Promise<Response>;
};

const legacy = legacyWorker as LegacyWorker;

export function dispatchLegacy(
  request: Request,
  env: WorkerBindings,
): Promise<Response> {
  return legacy.fetch(request, env);
}
