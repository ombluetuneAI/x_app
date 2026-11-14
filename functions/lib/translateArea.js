/**
 * Resolve the DOM container for a tweet's translate UI.
 * Timeline posts use id="translate-{id}"; tweet detail / replies use id="translate-detail-{id}".
 */
export function resolveTranslateArea(tweetId, { getElementById, buttonEl } = {}) {
  if (!getElementById) {
    return null;
  }

  if (buttonEl && typeof buttonEl.closest === 'function') {
    const fromBtn = buttonEl.closest('.tweet-translate-area');
    if (fromBtn) {
      return fromBtn;
    }
  }

  return (
    getElementById(`translate-${tweetId}`) ||
    getElementById(`translate-detail-${tweetId}`) ||
    null
  );
}

/**
 * Find tweet text element adjacent to the translate area (preceding .tweet-text sibling).
 */
export function getTweetTextFromTranslateArea(area) {
  if (!area) {
    return '';
  }
  const tweetTextEl = area.previousElementSibling;
  return tweetTextEl ? tweetTextEl.textContent : '';
}