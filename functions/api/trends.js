import { createXApi } from '../lib/xapi.js';
import { apiSuccess, withApiHandler } from '../lib/response.js';

export async function onRequestGet(context) {
  const { env } = context;
  return withApiHandler(env, async () => {
    const api = createXApi(env);
    const { trends } = await api.getTrends();
    return apiSuccess({ trends });
  });
}