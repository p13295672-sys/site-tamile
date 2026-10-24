function encodePath(path) { return path.split("/").map(encodeURIComponent).join("/"); }
export async function onRequest({ request, env }) {
  if (request.method !== "PUT" || !env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO || !env.GITHUB_BRANCH) return new Response("Publicação indisponível.", { status: 503 });
  if (new URL(request.url).origin !== request.headers.get("Origin")) return new Response("Solicitação inválida.", { status: 403 });
  if (Number(request.headers.get("Content-Length") || 0) > 7000000) return new Response("Arquivo muito grande.", { status: 413 });
  try {
    const { path, content } = await request.json();
    if (typeof path !== "string" || typeof content !== "string" || content.length > 6500000 || path.startsWith("/") || path.split("/").some(part => !part || part.startsWith(".") || part === "..") || !/^[\p{L}\p{N}._/ -]+$/u.test(path) || path === "admin.html" || path.startsWith("functions/") || path === "_routes.json") return new Response("Arquivo inválido.", { status: 400 });
    const url = "https://api.github.com/repos/" + encodeURIComponent(env.GITHUB_OWNER) + "/" + encodeURIComponent(env.GITHUB_REPO) + "/contents/" + encodePath(path);
    const headers = { Authorization: "Bearer " + env.GITHUB_TOKEN, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" };
    const existing = await fetch(url + "?ref=" + encodeURIComponent(env.GITHUB_BRANCH), { headers });
    let sha;
    if (existing.ok) sha = (await existing.json()).sha;
    else if (existing.status !== 404) return new Response("Não foi possível publicar o arquivo.", { status: 502 });
    const result = await fetch(url, { method: "PUT", headers, body: JSON.stringify({ message: "Publica arquivo do site Mavie Closet", content, branch: env.GITHUB_BRANCH, ...(sha ? { sha } : {}) }) });
    return new Response(result.ok ? JSON.stringify({ ok: true }) : "Não foi possível publicar o arquivo.", { status: result.ok ? 200 : 502, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
  } catch { return new Response("Solicitação inválida.", { status: 400 }); }
}
