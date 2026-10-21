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

export function getTweetDetailInstructions(data) {
  const paths = [
    ['data', 'threaded_conversation_with_injections_v2', 'instructions'],
    ['data', 'threaded_conversation_with_injections', 'instructions'],
  ];
  for (const path of paths) {
    const instructions = safeGet(data, ...path);
    if (instructions) return instructions;
  }
  return [];
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
      return inst.entries || [];
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
  const content = entry.content || {};
  const entryType = content.entryType || '';
  const tweets = [];

  function addFromTweetResults(tweetResults) {
    if (!tweetResults) return;
    const tweet = tweetFromDict(tweetResults);
    if (tweet) tweets.push(tweet);
  }

  if (entryType === 'TimelineTimelineItem') {
    addFromTweetResults(content.itemContent?.tweet_results);
  } else if (entryType === 'TimelineTimelineModule') {
    for (const item of content.items || []) {
      addFromTweetResults(item.item?.itemContent?.tweet_results);
    }
  }
  return tweets;
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

/**
 * Parse TweetDetail (thread + replies) response.
 * @param {object} data - Raw GraphQL JSON
 * @param {string} focalTweetId - Tweet id requested by the client
 */
export function parseTweetDetail(data, focalTweetId) {
  const instructions = getTweetDetailInstructions(data);
  const entries = getEntries(instructions);
  const orderedTweets = [];
  const seen = new Set();

  for (const entry of entries) {
    if (entry.content?.entryType === 'TimelineTimelineCursor') continue;
    for (const tweet of parseTweetsFromEntry(entry)) {
      if (!tweet?.id || seen.has(tweet.id)) continue;
      seen.add(tweet.id);
      orderedTweets.push(tweet);
    }
  }

  const focalId = String(focalTweetId || '');
  let focalIndex = focalId ? orderedTweets.findIndex((t) => t.id === focalId) : -1;
  if (focalIndex < 0 && orderedTweets.length === 1) {
    focalIndex = 0;
  }

  let ancestors = [];
  let tweet = null;
  let replies = [];

  if (focalIndex >= 0) {
    ancestors = orderedTweets.slice(0, focalIndex);
    tweet = orderedTweets[focalIndex];
    replies = orderedTweets.slice(focalIndex + 1);
  } else if (orderedTweets.length > 0) {
    tweet = orderedTweets[0];
    replies = orderedTweets.slice(1);
  }

  let nextCursor = getNextCursor(entries);
  if (!nextCursor || nextCursor.startsWith('0|')) nextCursor = '';

  return { tweet, ancestors, replies, nextCursor };
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
        const entries = inst.entries || [];
        allEntries.push(...entries);
        for (const entry of entries) {
          const content = entry.content || {};
          if (content.entryType === 'TimelineTimelineModule') {
            for (const item of content.items || []) {
              const itemContent = item.item?.itemContent;
              if (itemContent) itemContents.push(itemContent);
            }
          }
        }
      } else if (instType === 'TimelineAddToModule') {
        for (const item of inst.moduleItems || []) {
          const itemContent = item.item?.itemContent;
          if (itemContent) itemContents.push(itemContent);
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
