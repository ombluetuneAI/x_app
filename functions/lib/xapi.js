import {
  APIEndpoints,
  Features,
  buildGraphqlParams,
  buildSearchTimelineVariables,
  buildTrendsParams,
  buildTypeaheadParams,
  buildTweetDetailVariables,
  getTweetDetailEndpoint,
} from './constants.js';
import { parseTweetDetail } from './parsers.js';
import { createHttpClient } from './http.js';
import {
  parseUserByScreenName,
  parseUsersFromTimeline,
  parseTweets,
  parseMediaList,
  parseTypeaheadUsers,
  parseTrends,
} from './parsers.js';
import { userFromV1Dict } from './models.js';
import { enrichUserMediaPage } from './userMediaEnrich.js';

const FRIENDSHIP_FORM = {
  include_profile_interstitial_type: 1,
  include_blocking: 1,
  include_blocked_by: 1,
  include_followed_by: 1,
  include_want_retweets: 1,
  include_mute_edge: 1,
  include_can_dm: 1,
  include_can_media_tag: 1,
  include_ext_is_blue_verified: 1,
  include_ext_verified_type: 1,
  include_ext_profile_image_shape: 1,
  skip_status: 1,
};

/**
 * @param {import('./types').Env} env
 */
export function createXApi(env) {
  const http = createHttpClient(env);

  return {
    async getUserByScreenName(screenName) {
      const variables = { screen_name: screenName, withSafetyModeUserFields: true };
      const params = buildGraphqlParams(
        variables,
        Features.USER_BY_SCREEN_NAME,
        Features.FIELD_TOGGLES_USER_LABELS
      );
      const data = await http.get(APIEndpoints.USER_BY_SCREEN_NAME, params);
      return parseUserByScreenName(data);
    },

    async getHomeTimeline({ count = 20, latest = false, cursor = '' }) {
      const variables = {
        count,
        includePromotedContent: false,
        latestControlAvailable: true,
        requestContext: 'launch',
        withVoice: true,
      };
      if (cursor) variables.cursor = cursor;

      const endpoint = latest ? APIEndpoints.HOME_LATEST_TIMELINE : APIEndpoints.HOME_TIMELINE;
      const features = latest ? Features.HOME_LATEST_TIMELINE : Features.HOME_TIMELINE;
      const params = buildGraphqlParams(
        variables,
        features,
        Features.FIELD_TOGGLES_WITH_ARTICLE
      );
      const data = await http.get(endpoint, params);
      return parseTweets(data);
    },

    async getTweetDetail(focalTweetId, { cursor = '' } = {}) {
      const variables = buildTweetDetailVariables(focalTweetId, cursor);
      const params = buildGraphqlParams(
        variables,
        Features.TWEET_DETAIL,
        Features.FIELD_TOGGLES_WITH_ARTICLE
      );
      const endpoint = getTweetDetailEndpoint(env);
      const data = await http.get(endpoint, params);
      return parseTweetDetail(data, focalTweetId, { continuation: Boolean(cursor) });
    },

    async getUserTweets(userId, { count = 20, cursor = '' }) {
      const variables = {
        userId: String(userId),
        count,
        includePromotedContent: false,
        withQuickPromoteEligibilityTweetFields: true,
        withVoice: true,
      };
      if (cursor) variables.cursor = cursor;
      const params = buildGraphqlParams(
        variables,
        Features.USER_TWEETS,
        Features.FIELD_TOGGLES_WITH_ARTICLE
      );
      const data = await http.get(APIEndpoints.USER_TWEETS, params);
      return parseTweets(data);
    },

    async getUserMedia(userId, { count = 50, cursor = '' }) {
      const variables = {
        userId: String(userId),
        count,
        cursor,
        includePromotedContent: false,
        withClientEventToken: false,
        withBirdwatchNotes: false,
        withVoice: true,
        withV2Timeline: true,
      };
      const params = buildGraphqlParams(
        variables,
        Features.USER_MEDIA,
        Features.FIELD_TOGGLES_WITH_ARTICLE
      );
      const data = await http.get(APIEndpoints.USER_MEDIA, params);
      return parseMediaList(data);
    },

    /**
     * UserMedia GraphQL omits retweeted photo/video; supplement from UserTweets.
     */
    async getUserMediaWithRetweets(
      userId,
      { count = 50, cursor = '', tweetsCursor = '', skipTweets = false } = {}
    ) {
      const mediaResult = await this.getUserMedia(userId, { count, cursor });

      let tweets = [];
      let nextTweetsCursor = '_done';
      if (!skipTweets) {
        const tweetCount = Math.max(count, 40);
        const tweetsResult = await this.getUserTweets(userId, {
          count: tweetCount,
          cursor: tweetsCursor,
        });
        tweets = tweetsResult.tweets;
        const tc = tweetsResult.nextCursor;
        nextTweetsCursor =
          tc && tc !== '' && !tc.startsWith('0|') ? tc : '_done';
      }

      const enriched = enrichUserMediaPage({
        nativeMedia: mediaResult.media,
        tweets,
      });

      return {
        media: enriched.media,
        nextCursor: mediaResult.nextCursor,
        nextTweetsCursor,
        sources: enriched.sources,
      };
    },

    async getFollowingPage(userId, { count = 50, cursor = '' }) {
      const variables = {
        userId: String(userId),
        count,
        includePromotedContent: false,
        cursor,
      };
      const params = buildGraphqlParams(variables, Features.FOLLOWING);
      const data = await http.get(APIEndpoints.FOLLOWING, params);
      return parseUsersFromTimeline(data);
    },

    async getFollowersPage(userId, { count = 50, cursor = '' }) {
      const cursorVal = cursor ? parseInt(cursor, 10) : -1;
      const params = {
        user_id: String(userId),
        count: String(count),
        cursor: String(cursorVal),
        skip_status: 'true',
        include_user_entities: 'true',
      };
      const data = await http.get(APIEndpoints.FOLLOWERS, params);
      const users = [];
      for (const userData of data.users || []) {
        const user = userFromV1Dict(userData);
        if (user) users.push(user);
      }
      const nextCursor = data.next_cursor;
      const nextCursorStr = nextCursor ? String(nextCursor) : '';
      return { users, nextCursor: nextCursorStr };
    },

    async followUser(userId) {
      await http.post(APIEndpoints.CREATE_FRIENDSHIP, {
        form: { ...FRIENDSHIP_FORM, user_id: String(userId) },
      });
    },

    async unfollowUser(userId) {
      await http.post(APIEndpoints.DESTROY_FRIENDSHIP, {
        form: { ...FRIENDSHIP_FORM, user_id: String(userId) },
      });
    },

    async searchUsers(query, { count = 20, cursor = '' } = {}) {
      const trimmed = String(query || '').trim();
      if (!trimmed) return { users: [], nextCursor: '' };
      if (!cursor && trimmed.length <= 50) {
        const typeahead = await http.get(
          APIEndpoints.SEARCH_TYPEAHEAD,
          buildTypeaheadParams(trimmed)
        );
        const { users } = parseTypeaheadUsers(typeahead);
        if (users.length) {
          return { users: users.slice(0, count), nextCursor: '' };
        }
      }
      const variables = buildSearchTimelineVariables({
        rawQuery: trimmed,
        product: 'People',
        count,
        cursor,
      });
      const params = buildGraphqlParams(
        variables,
        Features.SEARCH_TIMELINE,
        Features.FIELD_TOGGLES_SEARCH
      );
      const data = await http.get(APIEndpoints.SEARCH_TIMELINE, params);
      return parseUsersFromTimeline(data);
    },

    async searchTweets(query, { count = 20, cursor = '' } = {}) {
      const trimmed = String(query || '').trim();
      if (!trimmed) return { tweets: [], nextCursor: '' };
      const variables = buildSearchTimelineVariables({
        rawQuery: trimmed,
        product: 'Latest',
        count,
        cursor,
      });
      const params = buildGraphqlParams(
        variables,
        Features.SEARCH_TIMELINE,
        Features.FIELD_TOGGLES_SEARCH
      );
      const data = await http.get(APIEndpoints.SEARCH_TIMELINE, params);
      return parseTweets(data);
    },

    async getTrends() {
      const data = await http.get(APIEndpoints.TRENDS, buildTrendsParams());
      return parseTrends(data);
    },
  };
}
