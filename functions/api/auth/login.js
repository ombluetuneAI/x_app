import { json, apiError } from '../../lib/response.js';

const COOKIE_NAME = 'access_key';
const MAX_AGE = 60 * 60 * 24 * 30;

export async function onRequestPost(context) {
  const { request, env } = context;
  const expected = env.ACCESS_KEY;

  if (!expected) {
    return apiError('ACCESS_KEY not configured on server', 503);
  }

  let key = '';
  const contentType = request.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => ({}));
    key = body.key || body.access_key || '';
  } else {
    const form = await request.formData().catch(() => null);
    key = form?.get('key') || form?.get('access_key') || '';
  }

  if (!key || key !== expected) {
    return apiError('Invalid access key', 401);
  }

  const secure = new URL(request.url).protocol === 'https:';
  const cookie = `${COOKIE_NAME}=${encodeURIComponent(key)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${
    secure ? '; Secure' : ''
  }`;

  return json({ success: true }, 200, { 'Set-Cookie': cookie });
}
