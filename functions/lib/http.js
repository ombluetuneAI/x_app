import { APIEndpoints, getBearerToken } from './constants.js';
import { humanizeGraphqlErrors } from './graphqlErrors.js';

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  Origin: 'https://x.com',
  Referer: 'https://x.com/',
  'X-Twitter-Active-User': 'yes',
  'X-Twitter-Auth-Type': 'OAuth2Session',
  'X-Twitter-Client-Language': 'en',
};

export class XHttpError extends Error {
  constructor(statusCode, message, response) {
    super(message);
    this.name = 'XHttpError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

/**
 * @param {import('./types').Env} env
 */
export function createHttpClient(env) {
  const authToken = env.X_AUTH_TOKEN;
  const ct0 = env.X_CT0;
  if (!authToken || !ct0) {
    throw new XHttpError(503, 'X API credentials not configured (X_AUTH_TOKEN, X_CT0)');
  }

  const bearer = getBearerToken(env);
  const cookie = `auth_token=${authToken}; ct0=${ct0}`;

  async function request(method, path, { params, json, form } = {}) {
    const url = new URL(path, APIEndpoints.BASE_URL);
    if (params) {
      if (params instanceof URLSearchParams) {
        url.search = params.toString();
      } else {
        for (const [k, v] of Object.entries(params)) {
          url.searchParams.set(k, String(v));
        }
      }
    }

    const headers = {
      ...DEFAULT_HEADERS,
      Authorization: `Bearer ${bearer}`,
      'X-Csrf-Token': ct0,
      Cookie: cookie,
    };

    let body;
    if (form) {
      const fd = new URLSearchParams();
      for (const [k, v] of Object.entries(form)) {
        fd.append(k, String(v));
      }
      body = fd.toString();
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    } else if (json !== undefined) {
      body = JSON.stringify(json);
    }

    const resp = await fetch(url.toString(), { method, headers, body });
    let data;
    const text = await resp.text();
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw_text: text };
    }

    if (!resp.ok) {
      const friendly =
        data?.errors?.length ? humanizeGraphqlErrors(data) : text?.slice(0, 500) || 'Unknown error';
      throw new XHttpError(resp.status, friendly, data);
    }
    if (data?.errors?.length) {
      throw new XHttpError(502, humanizeGraphqlErrors(data), data);
    }
    return data;
  }

  return {
    get(path, params) {
      return request('GET', path, { params });
    },
    post(path, { form, json, params } = {}) {
      return request('POST', path, { form, json, params });
    },
  };
}
