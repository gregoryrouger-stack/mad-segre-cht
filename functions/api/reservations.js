// Fonction Cloudflare Pages : GET/POST /api/reservations
// Stocke les réservations dans une base D1 (SQL) — binding "MAD_DB"
// D1 est fortement cohérent (contrairement à KV) : pas de lecture périmée possible.

const NO_CACHE_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

export async function onRequestGet({ env }) {
  const row = await env.MAD_DB
    .prepare("SELECT value FROM app_data WHERE key = ?")
    .bind("reservations")
    .first();
  return new Response(row ? row.value : "null", {
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
  await env.MAD_DB
    .prepare(
      "INSERT INTO app_data (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
    .bind("reservations", body)
    .run();
  return new Response(JSON.stringify({ ok: true }), {
    headers: NO_CACHE_HEADERS,
  });
}
