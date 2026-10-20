export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

export function apiSuccess(data) {
  return json({ success: true, data });
}

export function apiOk() {
  return json({ success: true });
}

export function apiError(error, status = 500) {
  return json({ success: false, error: String(error) }, status);
}

export async function withApiHandler(env, handler) {
  try {
    const result = await handler();
    return result;
  } catch (e) {
    const status = e.statusCode || 500;
    return apiError(e.message || e, status);
  }
}
