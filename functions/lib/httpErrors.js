import { humanizeGraphqlErrors } from './graphqlErrors.js';

/**
 * @param {number} statusCode
 * @param {string} path
 * @param {string} [bodyText]
 * @param {unknown} [body]
 * @returns {string}
 */
export function friendlyXHttpError(statusCode, path, bodyText = '', body) {
  if (statusCode === 404 && /SearchTimeline/i.test(path)) {
    return '帖子搜索接口不可用（SearchTimeline GraphQL query id 可能已过期，可设置环境变量 X_SEARCH_TIMELINE_QUERY_ID）';
  }
  if (body?.errors?.length) {
    return humanizeGraphqlErrors(body);
  }
  const trimmed = String(bodyText || '').trim();
  if (trimmed && trimmed.length <= 500 && !trimmed.startsWith('{')) {
    return trimmed;
  }
  if (statusCode === 404) {
    const op = path.split('/').pop() || 'request';
    return `X API 返回 404（${op}）`;
  }
  return trimmed.slice(0, 500) || '请求失败，请稍后重试';
}