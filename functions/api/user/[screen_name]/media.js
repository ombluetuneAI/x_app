import { createXApi } from '../../../lib/xapi.js';
import { userToDict } from '../../../lib/models.js';
import { apiSuccess, apiError, withApiHandler } from '../../../lib/response.js';

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const screenName = params.screen_name;
  const url = new URL(request.url);
  const count = parseInt(url.searchParams.get('count') || '50', 10);
  const cursor = url.searchParams.get('cursor') || '';
  const tweetsCursorParam = url.searchParams.get('tweets_cursor');
  const includeRetweets = url.searchParams.get('include_retweets') !== '0';
  const skipTweets =
    !includeRetweets || tweetsCursorParam === '_done';
  const tweetsCursor =
    tweetsCursorParam && tweetsCursorParam !== '_done' ? tweetsCursorParam : '';

  return withApiHandler(env, async () => {
    const api = createXApi(env);
    const user = await api.getUserByScreenName(screenName);
    if (!user) {
      return apiError('User not found', 404);
    }
    const { media, nextCursor, nextTweetsCursor, sources } =
      await api.getUserMediaWithRetweets(user.id, {
        count,
        cursor,
        tweetsCursor,
        skipTweets,
      });
    return apiSuccess({
      user: userToDict(user),
      media,
      cursor: nextCursor,
      tweets_cursor: nextTweetsCursor,
      media_sources: sources,
    });
  });
}
