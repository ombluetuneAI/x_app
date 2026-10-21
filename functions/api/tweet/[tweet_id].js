import { createXApi } from '../../lib/xapi.js';
import { tweetToDict } from '../../lib/models.js';
import { apiSuccess, apiError, withApiHandler } from '../../lib/response.js';

export async function onRequestGet(context) {
  const { env, params, request } = context;
  const tweetId = params.tweet_id;
  const url = new URL(request.url);
  const cursor = url.searchParams.get('cursor') || '';

  if (!tweetId || !/^\d+$/.test(tweetId)) {
    return apiError('Invalid tweet id', 400);
  }

  return withApiHandler(env, async () => {
    const api = createXApi(env);
    const { tweet, ancestors, replies, nextCursor } = await api.getTweetDetail(tweetId, {
      cursor,
    });
    if (!tweet) {
      return apiError('Tweet not found', 404);
    }
    return apiSuccess({
      tweet: tweetToDict(tweet),
      ancestors: ancestors.map(tweetToDict),
      replies: replies.map(tweetToDict),
      cursor: nextCursor,
    });
  });
}
