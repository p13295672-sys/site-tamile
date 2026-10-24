const encoder = new TextEncoder();
const SESSION_COOKIE = "__Host-mavie_admin";
const NONCE_COOKIE = "__Host-mavie_nonce";

function b64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromB64url(value) {
  const raw = atob(value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "="));
  return Uint8Array.from(raw, char => char.charCodeAt(0));
}

function decodeJson(value) {
  return JSON.parse(new TextDecoder().decode(fromB64url(value)));
}

export function cookies(request) {
  return Object.fromEntries((request.headers.get("Cookie") || "").split(";").map(part => {
    const index = part.indexOf("=");
    return index < 0 ? ["", ""] : [part.slice(0, index).trim(), part.slice(index + 1).trim()];
  }).filter(([key]) => key));
}

export function cookie(name, value, maxAge) {
  return `${name}=${value}; Path=/; Max-Age=${maxAge}; Secure; HttpOnly; SameSite=Strict`;
}

export function clearCookie(name) {
  return `${name}=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Strict`;
}

async function hmacKey(secret) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function createSession(email, secret) {
  const payload = b64url(encoder.encode(JSON.stringify({ email, exp: Math.floor(Date.now() / 1000) + 3600 })));
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(payload));
  return `${payload}.${b64url(new Uint8Array(signature))}`;
}

export function allowedAdminEmails(env) {
  return String(env.ADMIN_EMAIL || "")
    .split(/[;,\s]+/)
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function verifySession(value, secret, allowedEmails) {
  if (!value || !secret) return null;
  try {
    const [payload, signature, extra] = value.split(".");
    if (!payload || !signature || extra) return null;
    const valid = await crypto.subtle.verify("HMAC", await hmacKey(secret), fromB64url(signature), encoder.encode(payload));
    if (!valid) return null;
    const claims = decodeJson(payload);
    const allowlist = Array.isArray(allowedEmails) ? allowedEmails : [allowedEmails];
    if (claims.exp <= Math.floor(Date.now() / 1000) || !allowlist.includes(String(claims.email || "").toLowerCase())) return null;
    return claims;
  } catch { return null; }
}

export async function verifyGoogleCredential(token, env, expectedNonce) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const header = decodeJson(parts[0]);
    const claims = decodeJson(parts[1]);
    if (header.alg !== "RS256" || typeof header.kid !== "string") return null;
    const now = Math.floor(Date.now() / 1000);
    const issuerOk = claims.iss === "accounts.google.com" || claims.iss === "https://accounts.google.com";
    if (!issuerOk || claims.aud !== env.GOOGLE_CLIENT_ID || !claims.sub ||
        !Number.isFinite(claims.exp) || claims.exp <= now ||
        (claims.iat && claims.iat > now + 60) || claims.nonce !== expectedNonce ||
        claims.email_verified !== true || !allowedAdminEmails(env).includes(String(claims.email || "").toLowerCase())) return null;
    const response = await fetch("https://www.googleapis.com/oauth2/v3/certs", { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    const jwks = await response.json();
    const jwk = (jwks.keys || []).find(key => key.kid === header.kid && key.alg === "RS256");
    if (!jwk) return null;
    const publicKey = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, fromB64url(parts[2]), encoder.encode(`${parts[0]}.${parts[1]}`));
    return valid ? { email: String(claims.email).toLowerCase() } : null;
  } catch { return null; }
}

export function sameOrigin(request) {
  return request.headers.get("Origin") === new URL(request.url).origin;
}

export { SESSION_COOKIE, NONCE_COOKIE };
