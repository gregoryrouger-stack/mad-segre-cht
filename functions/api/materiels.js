// Fonction Cloudflare Pages : GET/POST /api/materiels
// Stocke la liste des matériels dans le KV Cloudflare (binding "MAD_KV")

const NO_CACHE_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

export async function onRequestGet({ env }) {
  const value = await env.MAD_KV.get("materiels");
  return new Response(value ?? "null", {
    headers: NO_CACHE_HEADERS,
  });
}

export async function onRequestPost({ request, env }) {
  const body = await request.text();
  try {
    JSON.parse(body);
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: "JSON invalide" }), {
      status: 400,
      headers: NO_CACHE_HEADERS,
    });
  }
  await env.MAD_KV.put("materiels", body);
  return new Response(JSON.stringify({ ok: true }), {
    headers: NO_CACHE_HEADERS,
  });
}
