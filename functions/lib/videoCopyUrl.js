/**
 * Resolve in-app media URLs to absolute https URLs for clipboard sharing.
 */

/**
 * @param {string} playbackUrl URL assigned to the video element (may be a site-relative proxy path)
 * @param {string} [origin] Page origin, e.g. https://example.pages.dev
 * @returns {string}
 */
export function resolveAbsolutePlaybackUrl(playbackUrl, origin = '') {
  if (!playbackUrl || typeof playbackUrl !== 'string') return '';
  const trimmed = playbackUrl.trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  if (trimmed.startsWith('/') && origin) {
    try {
      const base = origin.endsWith('/') ? origin : `${origin}/`;
      return new URL(trimmed, base).href;
    } catch {
      return '';
    }
  }

  return '';
}

/**
 * Pick the URL copied when the user taps「复制视频」.
 * Prefers the same proxied playback URL the lightbox player uses, made absolute.
 *
 * @param {{ playbackUrl?: string, rawVideoUrl?: string, origin?: string }} opts
 * @returns {string}
 */
export function getVideoClipboardUrl({ playbackUrl = '', rawVideoUrl = '', origin = '' } = {}) {
  const primary = playbackUrl || rawVideoUrl;
  const absolute = resolveAbsolutePlaybackUrl(primary, origin);
  // Prefer absolute playback URL (https on Pages; http allowed for local wrangler).
  if (absolute && /^https?:\/\//i.test(absolute)) return absolute;

  if (rawVideoUrl && /^https:\/\//i.test(rawVideoUrl.trim())) {
    return rawVideoUrl.trim();
  }

  return '';
}

/**
 * @param {string} url
 * @returns {boolean}
 */
export function isAbsoluteHttpsMediaUrl(url) {
  return typeof url === 'string' && /^https:\/\//i.test(url.trim());
}
