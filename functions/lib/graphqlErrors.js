/**
 * Turn GraphQL error payloads into short, user-facing messages (never raw JSON).
 * @param {unknown} body
 * @returns {string}
 */
export function humanizeGraphqlErrors(body) {
  const errors = body?.errors;
  if (!Array.isArray(errors) || errors.length === 0) {
    return 'Unable to load this post.';
  }
  const first = errors[0];
  const code = first?.extensions?.code || first?.code || '';
  const message = String(first?.message || '').trim();

  if (code === 'GRAPHQL_VALIDATION_FAILED') {
    return 'Unable to load this post (request was rejected by the API).';
  }
  if (message && message.length <= 160 && !message.startsWith('{')) {
    return message;
  }
  return 'Unable to load this post.';
}
