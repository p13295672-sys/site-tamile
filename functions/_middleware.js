import { cookies, verifySession, SESSION_COOKIE } from "./_auth.js";

const publicAdminRoutes = new Set([
  "/api/admin/login-config",
  "/api/admin/login",
  "/api/admin/logout"
]);

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const isAdmin = url.pathname === "/admin.html" || url.pathname.startsWith("/api/admin/");
  if (!isAdmin) return next();
  const headersFor = response => {
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "no-store, private");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "no-referrer");
    headers.set("X-Frame-Options", "DENY");
    headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; frame-src https://accounts.google.com; connect-src 'self' https://accounts.google.com");
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  };
  if (url.pathname === "/admin.html") return headersFor(await next());
  if (publicAdminRoutes.has(url.pathname)) return headersFor(await next());
  const fail = () => new Response("Não foi possível acessar esta página.", {
    status: 404, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
  });
  if (!env.ADMIN_EMAIL || !env.ADMIN_SESSION_SECRET) return fail();
  const session = await verifySession(cookies(request)[SESSION_COOKIE], env.ADMIN_SESSION_SECRET, env.ADMIN_EMAIL.trim().toLowerCase());
  if (!session) return fail();
  return headersFor(await next());
}
