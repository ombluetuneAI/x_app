const COOKIE_NAME = 'access_key';
const PUBLIC_PATHS = new Set(['/login', '/login.html', '/api/auth/login']);

function isPublicAsset(pathname) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname === '/favicon.ico') return true;
  return /\.(css|js|ico|png|svg|woff2?)$/i.test(pathname);
}

function getProvidedKey(request) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (match?.[1]) return decodeURIComponent(match[1]);
  return request.headers.get('X-Access-Key') || '';
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const accessKey = env.ACCESS_KEY;

  if (!accessKey) {
    return next();
  }

  if (isPublicAsset(url.pathname)) {
    return next();
  }

  if (getProvidedKey(request) === accessKey) {
    return next();
  }

  if (url.pathname.startsWith('/api/')) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const loginUrl = new URL('/login', url.origin);
  loginUrl.searchParams.set('redirect', url.pathname + url.search);
  return Response.redirect(loginUrl.toString(), 302);
}
