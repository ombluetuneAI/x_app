import { createXApi } from '../../../lib/xapi.js';
import { apiOk, withApiHandler } from '../../../lib/response.js';

export async function onRequestPost(context) {
  const { env, params } = context;
  const userId = params.user_id;

  return withApiHandler(env, async () => {
    const api = createXApi(env);
    await api.unfollowUser(userId);
    return apiOk();
  });
}
