const enc = new TextEncoder();

function decodePart(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")));
}

async function verifyAccessJwt(token, teamDomain, audience) {
  const [headerPart, payloadPart, signaturePart] = token.split(".");
  if (!headerPart || !payloadPart || !signaturePart) return null;
  const header = decodePart(headerPart);
  const payload = decodePart(payloadPart);
  if (header.alg !== "RS256") return null;
  const issuer = teamDomain.replace(/\/$/, "");
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  const now = Math.floor(Date.now() / 1000);
  if (payload.iss !== issuer || !aud.includes(audience) || !payload.email || !Number.isFinite(payload.exp) || payload.exp <= now || (payload.nbf && payload.nbf > now)) return null;
  const response = await fetch(issuer + "/cdn-cgi/access/certs", { headers: { Accept: "application/json" } });
  if (!response.ok) return null;
  const jwks = await response.json();
  const jwk = (jwks.keys || []).find(key => key.kid === header.kid && (!key.alg || key.alg === "RS256"));
  if (!jwk) return null;
  const publicKey = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const signature = Uint8Array.from(atob(signaturePart.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
  return await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, signature, enc.encode(headerPart + "." + payloadPart)) ? payload : null;
}

export async function onRequest({ request, env, next }) {
  const path = new URL(request.url).pathname;
  if (path !== "/admin.html" && !path.startsWith("/api/admin/")) return next();
  const fail = () => new Response("Não foi possível acessar esta página.", { status: 404, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  if (!env.CF_ACCESS_TEAM_DOMAIN || !env.CF_ACCESS_AUD || !env.ADMIN_EMAIL) return fail();
  try {
    const token = request.headers.get("Cf-Access-Jwt-Assertion");
    if (!token) return fail();
    const claims = await verifyAccessJwt(token, env.CF_ACCESS_TEAM_DOMAIN, env.CF_ACCESS_AUD);
    if (!claims || String(claims.email).toLowerCase() !== env.ADMIN_EMAIL.trim().toLowerCase()) return fail();
    const response = await next();
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "no-store, private");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "no-referrer");
    headers.set("X-Frame-Options", "DENY");
    headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  } catch { return fail(); }
}
