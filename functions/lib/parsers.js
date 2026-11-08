import { filterTimelineEntries } from './adFilter.js';
import { isPromotedTimelineEntry, isPromotedItemContent } from './adFilter.js';
import { userFromDict, mediaFromDict } from './models.js';
import { tweetFromDict } from './models.js';

export function safeGet(data, ...keys) {
  let current = data;
  for (const key of keys) {
    if (!current || typeof current !== 'object') return undefined;
    current = current[key];
    if (current === undefined || current === null) return undefined;
  }
  return current;
}

export function getInstructions(data) {
  const paths = [
    ['data', 'user', 'result', 'timeline_v2', 'timeline', 'instructions'],
    ['data', 'user', 'result', 'timeline', 'timeline', 'instructions'],
    ['data', 'list', 'members_timeline', 'timeline', 'instructions'],
    ['data', 'home', 'home_timeline_urt', 'instructions'],
  ];
  for (const path of paths) {
    const instructions = safeGet(data, ...path);
    if (instructions) return instructions;
  }
  return [];
}

export function getEntries(instructions) {
  for (const inst of instructions) {
    if (inst.type === 'TimelineAddEntries') {
      return filterTimelineEntries(inst.entries || []);
    }
  }
  return [];
}

export function getNextCursor(entries) {
  for (let i = entries.length - 1; i >= 0; i--) {
    const content = entries[i].content || {};
    if (content.entryType === 'TimelineTimelineCursor' && content.cursorType === 'Bottom') {
      return content.value || '';
    }
  }
  return '';
}

export function getItemContents(entry) {
  const content = entry.content || {};
  const entryType = content.entryType || '';

  if (entryType === 'TimelineTimelineModule') {
    const items = content.items || [];
    return items.map((item) => item.item?.itemContent || {}).filter(Boolean);
  }
  if (entryType === 'TimelineTimelineItem') {
    const itemContent = content.itemContent;
    return itemContent ? [itemContent] : [];
  }
  if (entryType === 'TimelineAddToModule') {
    return content.moduleItems || [];
  }
  return [];
}

export function parseUserByScreenName(data) {
  try {
    const userResults = data.data.user;
    const result = userResults?.result;
    if (!result || result.__typename === 'UserUnavailable') return null;
    return userFromDict(userResults);
  } catch {
    return null;
  }
}

export function parseUsersFromTimeline(data) {
  const instructions = getInstructions(data);
  const entries = getEntries(instructions);
  const users = [];
  for (const entry of entries) {
    if (entry.content?.entryType === 'TimelineTimelineCursor') continue;
    for (const item of getItemContents(entry)) {
      const userResults = item.user_results;
      if (userResults) {
        const user = userFromDict(userResults);
        if (user) users.push(user);
      }
    }
  }
  let nextCursor = getNextCursor(entries);
  if (!nextCursor || nextCursor.startsWith('0|')) nextCursor = '';
  return { users, nextCursor };
}

export function parseTweetsFromEntry(entry) {
  if (isPromotedTimelineEntry(entry)) return [];

  const content = entry.content || {};
  const entryType = content.entryType || '';
  const tweets = [];

  function addFromTweetResults(tweetResults) {
    if (!tweetResults) return;
    const tweet = tweetFromDict(tweetResults);
    if (tweet) tweets.push(tweet);
  }

  if (entryType === 'TimelineTimelineItem') {
    const itemContent = content.itemContent;
    if (!isPromotedItemContent(itemContent)) {
      addFromTweetResults(itemContent?.tweet_results);
    }
  } else if (entryType === 'TimelineTimelineModule') {
    for (const item of content.items || []) {
      const itemContent = item.item?.itemContent;
      if (isPromotedItemContent(itemContent)) continue;
      addFromTweetResults(itemContent?.tweet_results);
    }
  }
  return tweets;
}

export function getTweetDetailInstructions(data) {
  const paths = [
    ['data', 'threaded_conversation_with_injections_v2', 'instructions'],
    ['data', 'tweetDetail', 'instructions'],
  ];
  for (const path of paths) {
    const instructions = safeGet(data, ...path);
    if (instructions) return instructions;
  }
  return [];
}

/**
 * Flatten tweet results from TweetDetail timeline entries in display order.
 * @param {object[]} entries
 * @returns {import('./models.js').Tweet[]}
 */
export function collectTweetsFromDetailEntries(entries) {
  const tweets = [];
  for (const entry of entries) {
    const entryType = entry.content?.entryType || '';
    if (entryType === 'TimelineTimelineCursor') continue;

    for (const item of getItemContents(entry)) {
      const tweetResults = item.tweet_results;
      if (!tweetResults) continue;
      const tweet = tweetFromDict(tweetResults);
      if (tweet) tweets.push(tweet);
    }
  }
  return tweets;
}

/**
 * @param {object} data - TweetDetail GraphQL response
 * @param {string} focalTweetId
 * @param {{ continuation?: boolean }} [options]
 */
export function parseTweetDetail(data, focalTweetId, options = {}) {
  const instructions = getTweetDetailInstructions(data);
  const entries = getEntries(instructions);
  const ordered = collectTweetsFromDetailEntries(entries);
  const focalId = String(focalTweetId);
  const nextCursor = getNextCursor(entries);

  if (options.continuation) {
    return {
      focal: null,
      ancestors: [],
      replies: ordered,
      nextCursor,
    };
  }

  let focalIndex = ordered.findIndex((t) => t.id === focalId);
  let focal = focalIndex >= 0 ? ordered[focalIndex] : null;

  if (!focal) {
    for (const entry of entries) {
      if (entry.entryId === `tweet-${focalId}`) {
        focal = collectTweetsFromDetailEntries([entry]).find((t) => t.id === focalId) || null;
        if (focal && focalIndex < 0) {
          focalIndex = ordered.findIndex((t) => t.id === focalId);
        }
        break;
      }
    }
  }

  const ancestors = focalIndex > 0 ? ordered.slice(0, focalIndex) : [];
  const replies = focalIndex >= 0 ? ordered.slice(focalIndex + 1) : ordered.filter((t) => t.id !== focalId);

  return { focal, ancestors, replies, nextCursor };
}

export function parseTweets(data) {
  const instructions = getInstructions(data);
  const entries = getEntries(instructions);
  const tweets = [];
  for (const entry of entries) {
    if (entry.content?.entryType === 'TimelineTimelineCursor') continue;
    tweets.push(...parseTweetsFromEntry(entry));
  }
  const nextCursor = getNextCursor(entries);
  return { tweets, nextCursor };
}

function mediaEntitiesFromLegacy(legacy) {
  if (!legacy) return [];
  const extended = legacy.extended_entities?.media;
  if (extended?.length) return extended;
  return legacy.entities?.media || [];
}

function mediaItemsFromRawEntities(mediaList, result, legacy) {
  const tweetId = String(result?.rest_id || legacy?.id_str || '');
  const tweetText = legacy?.full_text || legacy?.text || '';
  return mediaList.map((mediaData) =>
    mediaFromDict({
      ...mediaData,
      tweet_id: tweetId,
      tweet_text: tweetText,
    })
  );
}

/**
 * Extract display media from a UserMedia tweet_results payload (including retweets).
 * UserMedia often uses TweetWithVisibilityResults where media can sit on the outer
 * legacy or on result.tweet.legacy (see eh-view-enhance twitter UserMedia parser).
 * @param {object} tweetResults
 * @returns {import('./models.js').ReturnType<typeof mediaFromDict>[]}
 */
export function mediaFromTweetResults(tweetResults) {
  const root = tweetResults?.result ?? tweetResults;
  if (!root || root.__typename === 'TweetTombstone') return [];

  const legacyCandidates = [];
  if (root.legacy) legacyCandidates.push({ result: root, legacy: root.legacy });
  if (root.tweet?.legacy) {
    legacyCandidates.push({ result: root.tweet, legacy: root.tweet.legacy });
  }

  for (const { result, legacy } of legacyCandidates) {
    const mediaList = mediaEntitiesFromLegacy(legacy);
    if (mediaList.length) {
      return mediaItemsFromRawEntities(mediaList, result, legacy);
    }
  }

  const tweet = tweetFromDict(tweetResults);
  if (!tweet) return [];
  const source =
    tweet.media?.length > 0
      ? tweet
      : tweet.retweeted_tweet?.media?.length > 0
        ? tweet.retweeted_tweet
        : null;
  if (!source) return [];
  return source.media.map((m) => ({
    ...m,
    tweet_id: source.id,
    tweet_text: source.text,
  }));
}

/** Summarize a raw UserMedia response for CLI/debug (no secrets). */
export function summarizeUserMediaResponse(data) {
  let itemCount = 0;
  let mediaCount = 0;
  let outerLegacyHits = 0;
  let innerLegacyHits = 0;
  let retweetFallbackHits = 0;
  const typenameCounts = {};

  try {
    const instructions =
      data?.data?.user?.result?.timeline_v2?.timeline?.instructions ||
      data?.data?.user?.result?.timeline?.timeline?.instructions ||
      [];
    const itemContents = [];
    for (const inst of instructions) {
      if (inst.type === 'TimelineAddToModule') {
        for (const item of inst.moduleItems || []) {
          const ic = item.item?.itemContent;
          if (ic?.tweet_results) itemContents.push(ic);
        }
      }
      if (inst.type === 'TimelineAddEntries') {
        for (const entry of inst.entries || []) {
          const content = entry.content || {};
          if (content.entryType === 'TimelineTimelineModule') {
            for (const item of content.items || []) {
              const ic = item.item?.itemContent;
              if (ic?.tweet_results) itemContents.push(ic);
            }
          }
          if (content.entryType === 'TimelineTimelineItem') {
            const ic = content.itemContent;
            if (ic?.tweet_results) itemContents.push(ic);
          }
        }
      }
    }

    for (const itemContent of itemContents) {
      itemCount += 1;
      const root = itemContent.tweet_results?.result;
      const tn = root?.__typename || 'unknown';
      typenameCounts[tn] = (typenameCounts[tn] || 0) + 1;
      if (mediaEntitiesFromLegacy(root?.legacy).length) outerLegacyHits += 1;
      else if (mediaEntitiesFromLegacy(root?.tweet?.legacy).length) innerLegacyHits += 1;
      const extracted = mediaFromTweetResults(itemContent.tweet_results);
      if (extracted.length) {
        mediaCount += extracted.length;
        if (
          !mediaEntitiesFromLegacy(root?.legacy).length &&
          !mediaEntitiesFromLegacy(root?.tweet?.legacy).length
        ) {
          retweetFallbackHits += 1;
        }
      }
    }
  } catch {
    /* keep partial stats */
  }

  return {
    itemCount,
    mediaCount,
    outerLegacyHits,
    innerLegacyHits,
    retweetFallbackHits,
    typenameCounts,
  };
}

export function parseMediaList(data) {
  try {
    const userResult = data.data.user.result;
    const timeline = userResult.timeline_v2 || userResult.timeline;
    if (!timeline) return { media: [], nextCursor: '' };

    const instructions = timeline.timeline?.instructions || [];
    const allEntries = [];
    const itemContents = [];

    for (const inst of instructions) {
      const instType = inst.type || '';
      if (instType === 'TimelineAddEntries') {
        const entries = filterTimelineEntries(inst.entries || []);
        allEntries.push(...entries);
        for (const entry of entries) {
          const content = entry.content || {};
          const entryType = content.entryType || '';
          if (entryType === 'TimelineTimelineItem') {
            const itemContent = content.itemContent;
            if (itemContent && !isPromotedItemContent(itemContent)) {
              itemContents.push(itemContent);
            }
          } else if (entryType === 'TimelineTimelineModule') {
            for (const item of content.items || []) {
              const itemContent = item.item?.itemContent;
              if (itemContent && !isPromotedItemContent(itemContent)) {
                itemContents.push(itemContent);
              }
            }
          }
        }
      } else if (instType === 'TimelineAddToModule') {
        for (const item of inst.moduleItems || []) {
          const itemContent = item.item?.itemContent;
          if (itemContent && !isPromotedItemContent(itemContent)) {
            itemContents.push(itemContent);
          }
        }
      }
    }

    let nextCursor = getNextCursor(allEntries);
    if (!nextCursor || nextCursor.startsWith('0|')) nextCursor = '';

    const allMedia = [];
    for (const itemContent of itemContents) {
      const tweetResults = itemContent.tweet_results;
      if (!tweetResults) continue;
      allMedia.push(...mediaFromTweetResults(tweetResults));
    }
    return { media: allMedia, nextCursor };
  } catch {
    return { media: [], nextCursor: '' };
  }
}
