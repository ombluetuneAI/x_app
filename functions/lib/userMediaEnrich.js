/** @typedef {import('./models.js').Tweet} Tweet */

export function mediaGalleryKey(m) {
  if (m.media_id) return String(m.media_id);
  const url = m.url || '';
  const tweetId = m.tweet_id || '';
  return url ? `${tweetId}:${url}` : tweetId;
}

/**
 * Media items from retweet shells on UserTweets (UserMedia GraphQL omits these).
 * @param {Tweet[]} tweets
 */
export function extractRetweetMediaFromTweets(tweets) {
  const out = [];
  if (!tweets?.length) return out;

  for (const tweet of tweets) {
    const inner = tweet.retweeted_tweet;
    if (!inner?.media?.length) continue;
    for (const m of inner.media) {
      out.push({
        ...m,
        tweet_id: inner.id,
        tweet_text: inner.text,
        created_at: inner.created_at || tweet.created_at || '',
        media_source: 'tweet_retweet',
        wrapper_tweet_id: tweet.id,
      });
    }
  }
  return out;
}

/**
 * Merge UserMedia + supplemental list; dedupe by mediaGalleryKey.
 * @param {object[]} primary native UserMedia items
 * @param {object[]} supplemental e.g. from UserTweets retweets
 */
export function mergeGalleryMediaLists(primary, supplemental) {
  const seen = new Set();
  const merged = [];

  for (const m of [...primary, ...supplemental]) {
    const key = mediaGalleryKey(m);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (!m.media_source) {
      merged.push({ ...m, media_source: 'user_media' });
    } else {
      merged.push(m);
    }
  }
  return merged;
}

export function sortGalleryMediaByDate(items) {
  return [...items].sort((a, b) => {
    const ta = Date.parse(a.created_at || '') || 0;
    const tb = Date.parse(b.created_at || '') || 0;
    if (tb !== ta) return tb - ta;
    return String(b.tweet_id || '').localeCompare(String(a.tweet_id || ''));
  });
}

/**
 * @param {object} options
 * @param {object[]} options.nativeMedia
 * @param {Tweet[]} options.tweets
 */
export function enrichUserMediaPage({ nativeMedia, tweets }) {
  const retweetMedia = extractRetweetMediaFromTweets(tweets);
  const merged = mergeGalleryMediaLists(nativeMedia, retweetMedia);
  const sorted = sortGalleryMediaByDate(merged);
  const retweetTweetIds = [...new Set(retweetMedia.map((m) => m.tweet_id).filter(Boolean))];

  return {
    media: sorted,
    sources: {
      user_media_count: nativeMedia.length,
      tweet_retweet_items: retweetMedia.length,
      tweet_retweet_tweet_ids: retweetTweetIds,
      merged_count: sorted.length,
    },
  };
}
