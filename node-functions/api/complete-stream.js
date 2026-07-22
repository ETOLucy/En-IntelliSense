import { proxyApiRequest } from '../_shared/proxy.js';

export function onRequest(context) {
  return proxyApiRequest(context);
}
