import { createXApi } from '../../lib/xapi.js';
import { tweetToDict } from '../../lib/models.js';
import { apiSuccess, withApiHandler } from '../../lib/response.js';

export async function onRequestGet(context) {
  const { env, params, request } = context;
  const id = params.id;
  const url = new URL(request.url);
  const cursor = url.searchParams.get('cursor') || '';

  return withApiHandler(env, async () => {
    const api = createXApi(env);
    const { focal, ancestors, replies, nextCursor } = await api.getTweetDetail(id, { cursor });
    return apiSuccess({
      focal: tweetToDict(focal),
      ancestors: ancestors.map(tweetToDict),
      replies: replies.map(tweetToDict),
      cursor: nextCursor,
    });
  });
}
