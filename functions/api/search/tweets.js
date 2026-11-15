import { createXApi } from '../../lib/xapi.js';
import { tweetToDict } from '../../lib/models.js';
import { apiSuccess, withApiHandler } from '../../lib/response.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  const count = parseInt(url.searchParams.get('count') || '20', 10);
  const cursor = url.searchParams.get('cursor') || '';

  if (!String(q).trim()) {
    return apiSuccess({ tweets: [], cursor: '' });
  }

  return withApiHandler(env, async () => {
    const api = createXApi(env);
    const { tweets, nextCursor } = await api.searchTweets(q, { count, cursor });
    return apiSuccess({
      tweets: tweets.map(tweetToDict),
      cursor: nextCursor,
    });
  });
}