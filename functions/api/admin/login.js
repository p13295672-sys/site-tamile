import { clearCookie, cookie, cookies, createSession, NONCE_COOKIE, sameOrigin, SESSION_COOKIE, verifyGoogleCredential } from "../../_auth.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return new Response("Solicitação inválida.", { status: 403 });
  if (!env.GOOGLE_CLIENT_ID || !env.ADMIN_EMAIL || !env.ADMIN_SESSION_SECRET ||
      env.ADMIN_SESSION_SECRET.length < 32 || Number(request.headers.get("Content-Length") || 0) > 20_000) {
    return new Response("Login indisponível.", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const { credential } = await request.json();
    if (typeof credential !== "string" || credential.length > 16_000) throw new Error("invalid");
    const jar = cookies(request);
    const identity = await verifyGoogleCredential(credential, env, jar[NONCE_COOKIE]);
    if (!identity) throw new Error("invalid");
    const session = await createSession(identity.email, env.ADMIN_SESSION_SECRET);
    const headers = new Headers({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, private"
    });
    headers.append("Set-Cookie", cookie(SESSION_COOKIE, session, 3600));
    headers.append("Set-Cookie", clearCookie(NONCE_COOKIE));
    return new Response(JSON.stringify({ ok: true }), { headers });
  } catch {
    return new Response("Não foi possível entrar. Confira a conta Google autorizada e tente novamente.", {
      status: 401, headers: { "Cache-Control": "no-store" }
    });
  }
}
