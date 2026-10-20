const PASS_THROUGH_HEADERS = [
  'content-type',
  'content-length',
  'accept-ranges',
  'content-range',
  'etag',
  'last-modified',
];

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Only HTTPS URLs on *.twimg.com (pbs.twimg.com, video.twimg.com, etc.)
 */
export function isAllowedMediaUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    return host === 'twimg.com' || host.endsWith('.twimg.com');
  } catch {
    return false;
  }
}

function copyResponseHeaders(upstream, extra = {}) {
  const headers = new Headers();
  for (const name of PASS_THROUGH_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  for (const [k, v] of Object.entries(extra)) {
    headers.set(k, v);
  }
  return headers;
}

function isLikelyVideo(targetUrl, contentType) {
  if (/video\.twimg\.com/i.test(targetUrl)) return true;
  if (contentType && contentType.includes('video/')) return true;
  return /\.(mp4|m4v)(\?|$)/i.test(targetUrl);
}

/**
 * @param {Request} request
 * @param {string} targetUrl decoded HTTPS media URL
 */
export async function proxyMediaRequest(request, targetUrl) {
  if (!isAllowedMediaUrl(targetUrl)) {
    return new Response(JSON.stringify({ success: false, error: 'URL host not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const method = request.method === 'HEAD' ? 'HEAD' : 'GET';
  const upstreamHeaders = new Headers({ 'User-Agent': DEFAULT_UA });
  const range = request.headers.get('Range');
  if (range) upstreamHeaders.set('Range', range);

  const fetchInit = {
    method,
    headers: upstreamHeaders,
    redirect: 'follow',
  };
  // Do not force cache on Range requests so 206 / Content-Range pass through for video seeking.
  if (!range) {
    fetchInit.cf = {
      cacheEverything: true,
      cacheTtl: isLikelyVideo(targetUrl) ? 3600 : 86400,
    };
  }

  const upstream = await fetch(targetUrl, fetchInit);

  if (!upstream.ok && upstream.status !== 206) {
    const body =
      method === 'HEAD'
        ? null
        : await upstream.text().catch(() => '');
    return new Response(
      body || JSON.stringify({ success: false, error: `Upstream returned ${upstream.status}` }),
      {
        status: upstream.status,
        headers: {
          'Content-Type': upstream.headers.get('Content-Type') || 'text/plain',
        },
      }
    );
  }

  const contentType = upstream.headers.get('Content-Type') || '';
  const video = isLikelyVideo(targetUrl, contentType);
  const cacheControl = video ? 'public, max-age=3600' : 'public, max-age=86400, immutable';

  const headers = copyResponseHeaders(upstream, {
    'Cache-Control': upstream.headers.get('Cache-Control') || cacheControl,
  });

  return new Response(method === 'HEAD' ? null : upstream.body, {
    status: upstream.status,
    headers,
  });
}
