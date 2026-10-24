import { clearCookie, NONCE_COOKIE, sameOrigin, SESSION_COOKIE } from "../../_auth.js";

export async function onRequestPost({ request }) {
  if (!sameOrigin(request)) return new Response("Solicitação inválida.", { status: 403 });
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, private"
  });
  headers.append("Set-Cookie", clearCookie(SESSION_COOKIE));
  headers.append("Set-Cookie", clearCookie(NONCE_COOKIE));
  return new Response(JSON.stringify({ ok: true }), { headers });
}
