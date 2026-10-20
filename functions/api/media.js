import { proxyMediaRequest } from '../lib/mediaProxy.js';

export async function onRequest(context) {
  const { request } = context;
  const method = request.method;

  if (method !== 'GET' && method !== 'HEAD') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', Allow: 'GET, HEAD' },
    });
  }

  const url = new URL(request.url);
  const target = url.searchParams.get('url');
  if (!target) {
    return new Response(JSON.stringify({ success: false, error: 'Missing url query parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let targetUrl;
  try {
    targetUrl = new URL(target).toString();
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Invalid url' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return proxyMediaRequest(request, targetUrl);
}
