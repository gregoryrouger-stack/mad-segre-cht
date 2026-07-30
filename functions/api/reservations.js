// Fonction Cloudflare Pages : GET/POST /api/reservations
// Stocke la liste des réservations dans le KV Cloudflare (binding "MAD_KV")
// Toutes les instances de l'appli (tous les appareils) lisent/écrivent la même clé.

const NO_CACHE_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

export async function onRequestGet({ env }) {
  const value = await env.MAD_KV.get("reservations");
  return new Response(value ?? "null", {
    headers: NO_CACHE_HEADERS,
  });
}

export async function onRequestPost({ request, env }) {
  const body = await request.text();
  // on vérifie juste que c'est du JSON valide avant d'écrire
  try {
    JSON.parse(body);
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: "JSON invalide" }), {
      status: 400,
      headers: NO_CACHE_HEADERS,
    });
  }
  await env.MAD_KV.put("reservations", body);
  return new Response(JSON.stringify({ ok: true }), {
    headers: NO_CACHE_HEADERS,
  });
}
