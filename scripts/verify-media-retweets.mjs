#!/usr/bin/env node
/**
 * Compare UserMedia-only vs UserMedia+UserTweets retweet supplement for one user.
 * Requires X_AUTH_TOKEN + X_CT0 in environment (never commit).
 *
 * Usage: SCREEN_NAME=elonmusk node scripts/verify-media-retweets.mjs
 */
import { createXApi } from '../functions/lib/xapi.js';
import { extractRetweetMediaFromTweets } from '../functions/lib/userMediaEnrich.js';

const screenName = process.env.SCREEN_NAME || process.argv[2] || 'elonmusk';

if (!process.env.X_AUTH_TOKEN || !process.env.X_CT0) {
  console.error('Blocked: set X_AUTH_TOKEN and X_CT0 for live verification.');
  process.exit(2);
}

const env = {
  X_AUTH_TOKEN: process.env.X_AUTH_TOKEN,
  X_CT0: process.env.X_CT0,
  X_BEARER: process.env.X_BEARER,
};

const api = createXApi(env);
const user = await api.getUserByScreenName(screenName);
if (!user) {
  console.error('User not found:', screenName);
  process.exit(3);
}

const tweetCount = 40;
const [native, tweetsPage, enriched] = await Promise.all([
  api.getUserMedia(user.id, { count: tweetCount }),
  api.getUserTweets(user.id, { count: tweetCount }),
  api.getUserMediaWithRetweets(user.id, { count: tweetCount }),
]);

const rtFromTweets = extractRetweetMediaFromTweets(tweetsPage.tweets);
const nativeIds = new Set(native.media.map((m) => m.tweet_id));
const rtIds = [...new Set(rtFromTweets.map((m) => m.tweet_id))];
const rtNotInNative = rtIds.filter((id) => !nativeIds.has(id));
const enrichedRt = enriched.media.filter((m) => m.media_source === 'tweet_retweet');
const enrichedRtIds = [...new Set(enrichedRt.map((m) => m.tweet_id))];

const report = {
  screen_name: screenName,
  native_user_media_count: native.media.length,
  tweets_page_retweet_media_items: rtFromTweets.length,
  retweet_inner_tweet_ids_on_tweets_page: rtIds,
  retweet_ids_missing_from_native_user_media: rtNotInNative,
  enriched_page_media_count: enriched.media.length,
  enriched_retweet_media_items: enrichedRt.length,
  enriched_retweet_tweet_ids: enrichedRtIds,
  api_media_sources: enriched.sources,
};

console.log(JSON.stringify(report, null, 2));
