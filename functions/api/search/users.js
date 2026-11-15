import { createXApi } from '../../lib/xapi.js';
import { userToDict } from '../../lib/models.js';
import { apiSuccess, withApiHandler } from '../../lib/response.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  const count = parseInt(url.searchParams.get('count') || '20', 10);
  const cursor = url.searchParams.get('cursor') || '';

  if (!String(q).trim()) {
    return apiSuccess({ users: [], cursor: '' });
  }

  return withApiHandler(env, async () => {
    const api = createXApi(env);
    const { users, nextCursor } = await api.searchUsers(q, { count, cursor });
    return apiSuccess({
      users: users.map(userToDict),
      cursor: nextCursor,
    });
  });
}