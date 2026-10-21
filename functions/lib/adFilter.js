/**
 * Detect and strip promoted / sponsored timeline entries from X GraphQL payloads.
 */

const PROMOTED_ENTRY_ID_PREFIXES = [
  'promoted-tweet-',
  'promoted-',
];

/**
 * @param {string | undefined} entryId
 */
export function isPromotedEntryId(entryId) {
  if (!entryId || typeof entryId !== 'string') return false;
  const id = entryId.toLowerCase();
  for (const prefix of PROMOTED_ENTRY_ID_PREFIXES) {
    if (id.startsWith(prefix)) return true;
  }
  if (id.includes('-promoted-')) return true;
  return false;
}

/**
 * @param {object | undefined} tweetResults
 */
export function isPromotedTweetResults(tweetResults) {
  if (!tweetResults || typeof tweetResults !== 'object') return false;
  const result = tweetResults.result;
  if (!result || typeof result !== 'object') return false;
  if (result.promotedMetadata) return true;
  if (result.tweet?.promotedMetadata) return true;
  return false;
}

/**
 * @param {object | undefined} itemContent
 */
export function isPromotedItemContent(itemContent) {
  if (!itemContent || typeof itemContent !== 'object') return false;
  if (itemContent.promotedMetadata) return true;
  const itemType = String(itemContent.itemType || '');
  if (/promot/i.test(itemType)) return true;
  if (isPromotedTweetResults(itemContent.tweet_results)) return true;
  return false;
}

/**
 * @param {object | undefined} entry
 */
export function isPromotedTimelineEntry(entry) {
  if (!entry || typeof entry !== 'object') return false;
  if (isPromotedEntryId(entry.entryId)) return true;

  const content = entry.content || {};
  const entryType = content.entryType || '';
  if (entryType === 'TimelineTimelineCursor') return false;

  if (entryType === 'TimelineTimelineItem') {
    return isPromotedItemContent(content.itemContent);
  }

  if (entryType === 'TimelineTimelineModule') {
    const headerText = String(content.header?.text || content.footer?.text || '').toLowerCase();
    if (headerText === 'promoted' || headerText.includes('sponsored')) return true;
    const items = content.items || [];
    if (items.length > 0 && items.every((item) => isPromotedItemContent(item.item?.itemContent))) {
      return true;
    }
  }

  return false;
}

/**
 * Remove promoted entries while preserving pagination cursors.
 * @param {object[]} entries
 * @returns {object[]}
 */
export function filterTimelineEntries(entries) {
  if (!Array.isArray(entries)) return [];

  const filtered = [];
  for (const entry of entries) {
    const content = entry.content || {};
    if (content.entryType === 'TimelineTimelineCursor') {
      filtered.push(entry);
      continue;
    }

    if (isPromotedTimelineEntry(entry)) continue;

    if (content.entryType === 'TimelineTimelineModule') {
      const items = (content.items || []).filter(
        (item) => !isPromotedItemContent(item.item?.itemContent)
      );
      if (!items.length) continue;
      if (items.length === (content.items || []).length) {
        filtered.push(entry);
      } else {
        filtered.push({
          ...entry,
          content: { ...content, items },
        });
      }
      continue;
    }

    if (content.entryType === 'TimelineTimelineItem' && isPromotedItemContent(content.itemContent)) {
      continue;
    }

    filtered.push(entry);
  }
  return filtered;
}
