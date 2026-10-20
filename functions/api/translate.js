import { generateAuthStr } from '../lib/md5.js';
import { json, apiError } from '../lib/response.js';

const NIUTRANS_API_URL = 'https://api.niutrans.com/v2/text/translate';

export async function onRequestPost(context) {
  const { request, env } = context;
  const body = await request.json().catch(() => ({}));
  const text = body.text || body.srcText || '';
  const from = body.from || 'auto';
  const to = body.to || 'zh';

  const appid = env.NIUTRANS_APP_ID || body.appId || body.appid || '';
  const apikey = env.NIUTRANS_API_KEY || body.apikey || '';

  if (!appid || !apikey) {
    return apiError(
      'NiuTrans credentials not configured (set NIUTRANS_APP_ID and NIUTRANS_API_KEY on the server, or pass appId in the request body for local dev)',
      503
    );
  }

  if (!text) {
    return apiError('No text to translate', 400);
  }

  const timestamp = Date.now().toString();
  const signParams = {
    appId: appid,
    apikey,
    from,
    srcText: text,
    timestamp,
    to,
  };
  const authStr = generateAuthStr(signParams);

  const requestBody = new URLSearchParams();
  requestBody.append('from', from);
  requestBody.append('to', to);
  requestBody.append('srcText', text);
  requestBody.append('appId', appid);
  requestBody.append('timestamp', timestamp);
  requestBody.append('authStr', authStr);

  const resp = await fetch(NIUTRANS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: requestBody.toString(),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    return apiError(data.error_msg || data.message || 'Translation failed', resp.status);
  }

  return json(data);
}
