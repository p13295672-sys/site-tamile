const allowed = {
  mode: new Set(["auto", "light", "dark"]),
  palette: new Set(["rose", "lavender", "olive", "original"]),
  headingFont: new Set(["Bodoni Moda", "Playfair Display", "Cormorant Garamond", "Georgia"]),
  bodyFont: new Set(["Figtree", "DM Sans", "Lato", "Nunito Sans", "Arial"])
};
function validConfig(value) {
  return value && typeof value === "object" && allowed.mode.has(value.mode) && allowed.palette.has(value.palette) && allowed.headingFont.has(value.headingFont) && allowed.bodyFont.has(value.bodyFont) && Number.isInteger(value.scale) && value.scale >= 90 && value.scale <= 120;
}
async function github(path, init, env) {
  return fetch("https://api.github.com/repos/" + encodeURIComponent(env.GITHUB_OWNER) + "/" + encodeURIComponent(env.GITHUB_REPO) + "/contents/" + path, { ...init, headers: { Authorization: "Bearer " + env.GITHUB_TOKEN, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...(init?.headers || {}) } });
}
export async function onRequest({ request, env }) {
  if (request.method === "GET") {
    if (!env.GITHUB_OWNER || !env.GITHUB_REPO || !env.GITHUB_BRANCH) return new Response("{}", { status: 503 });
    const url = "https://raw.githubusercontent.com/" + encodeURIComponent(env.GITHUB_OWNER) + "/" + encodeURIComponent(env.GITHUB_REPO) + "/" + encodeURIComponent(env.GITHUB_BRANCH) + "/site-config.json";
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    return new Response(response.ok ? await response.text() : "{}", { status: response.ok ? 200 : 503, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
  }
  if (request.method !== "PUT" || !env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO || !env.GITHUB_BRANCH) return new Response("Solicitação indisponível.", { status: 503 });
  if (new URL(request.url).origin !== request.headers.get("Origin")) return new Response("Solicitação inválida.", { status: 403 });
  try {
    const value = await request.json();
    if (!validConfig(value)) return new Response("Configuração inválida.", { status: 400 });
    const target = "site-config.json";
    const existing = await github(target + "?ref=" + encodeURIComponent(env.GITHUB_BRANCH), undefined, env);
    let sha;
    if (existing.ok) sha = (await existing.json()).sha;
    else if (existing.status !== 404) return new Response("Não foi possível salvar a configuração.", { status: 502 });
    const content = btoa(unescape(encodeURIComponent(JSON.stringify({ ...value, updatedAt: new Date().toISOString() }, null, 2) + "\n")));
    const saved = await github(target, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "Atualiza aparência da loja", content, branch: env.GITHUB_BRANCH, ...(sha ? { sha } : {}) }) }, env);
    return new Response(saved.ok ? JSON.stringify({ ok: true }) : "Não foi possível salvar a configuração.", { status: saved.ok ? 200 : 502, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
  } catch { return new Response("Solicitação inválida.", { status: 400 }); }
}
