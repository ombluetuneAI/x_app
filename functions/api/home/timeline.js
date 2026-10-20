import { createXApi } from '../../lib/xapi.js';
import { tweetToDict } from '../../lib/models.js';
import { apiSuccess, apiError, withApiHandler } from '../../lib/response.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const count = parseInt(url.searchParams.get('count') || '20', 10);
  const cursor = url.searchParams.get('cursor') || '';
  const feedType = url.searchParams.get('type') || 'foryou';
  const latest = feedType === 'following';

  return withApiHandler(env, async () => {
    const api = createXApi(env);
    const { tweets, nextCursor } = await api.getHomeTimeline({ count, latest, cursor });
    return apiSuccess({
      tweets: tweets.map(tweetToDict),
      cursor: nextCursor,
    });
  });
}
