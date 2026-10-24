import { cookies, SESSION_COOKIE } from "../../_auth.js";

export async function onRequestGet({ request }) {
  const value = cookies(request)[SESSION_COOKIE];
  if (!value) return new Response("Não autenticada.", { status: 401, headers: { "Cache-Control": "no-store" } });
  // Middleware already verified signature, expiry, and allowed email.
  const payload = value.split(".")[0];
  try {
    const raw = atob(payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "="));
    const claims = JSON.parse(new TextDecoder().decode(Uint8Array.from(raw, c => c.charCodeAt(0))));
    return new Response(JSON.stringify({ email: claims.email }), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
    });
  } catch { return new Response("Não autenticada.", { status: 401, headers: { "Cache-Control": "no-store" } }); }
}
