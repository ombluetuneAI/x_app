import { createXApi } from '../../lib/xapi.js';
import { userToDict } from '../../lib/models.js';
import { apiSuccess, apiError, withApiHandler } from '../../lib/response.js';

export async function onRequestGet(context) {
  const { env, params } = context;
  const screenName = params.screen_name;

  return withApiHandler(env, async () => {
    const api = createXApi(env);
    const user = await api.getUserByScreenName(screenName);
    if (!user) {
      return apiError('User not found', 404);
    }
    return apiSuccess(userToDict(user));
  });
}
