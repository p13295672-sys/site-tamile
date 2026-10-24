import { cookie, NONCE_COOKIE } from "../../_auth.js";

export async function onRequestGet({ env }) {
  if (!env.GOOGLE_CLIENT_ID || !env.ADMIN_EMAIL || !env.ADMIN_SESSION_SECRET) {
    return new Response("Login indisponível.", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const nonceBytes = crypto.getRandomValues(new Uint8Array(32));
  let nonce = "";
  for (const byte of nonceBytes) nonce += byte.toString(16).padStart(2, "0");
  return new Response(JSON.stringify({ clientId: env.GOOGLE_CLIENT_ID, nonce }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, private",
      "Set-Cookie": cookie(NONCE_COOKIE, nonce, 300)
    }
  });
}
