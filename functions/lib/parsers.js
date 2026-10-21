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
          if (content.entryType === 'TimelineTimelineModule') {
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
      let result = tweetResults.result;
      if (!result) continue;
      if (result.tweet) result = result.tweet;
      const legacy = result.legacy || {};
      const tweetId = String(result.rest_id || legacy.id_str || '');
      const tweetText = legacy.full_text || legacy.text || '';
      let mediaList = legacy.extended_entities?.media || [];
      if (!mediaList.length) mediaList = legacy.entities?.media || [];
      if (!mediaList.length) continue;
      for (const mediaData of mediaList) {
        allMedia.push(
          mediaFromDict({
            ...mediaData,
            tweet_id: tweetId,
            tweet_text: tweetText,
          })
        );
      }
    }
    return { media: allMedia, nextCursor };
  } catch {
    return { media: [], nextCursor: '' };
  }
}
