import { createXApi } from '../../../lib/xapi.js';
import { userToDict, tweetToDict } from '../../../lib/models.js';
import { apiSuccess, apiError, withApiHandler } from '../../../lib/response.js';

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const screenName = params.screen_name;
  const url = new URL(request.url);
  const count = parseInt(url.searchParams.get('count') || '20', 10);
  const cursor = url.searchParams.get('cursor') || '';

  return withApiHandler(env, async () => {
    const api = createXApi(env);
    const user = await api.getUserByScreenName(screenName);
    if (!user) {
      return apiError('User not found', 404);
    }
    const { tweets, nextCursor } = await api.getUserTweets(user.id, { count, cursor });
    return apiSuccess({
      user: userToDict(user),
      tweets: tweets.map(tweetToDict),
      cursor: nextCursor,
    });
  });
}
