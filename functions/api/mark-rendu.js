// Fonction Cloudflare Pages : POST /api/mark-rendu
// Marque une réservation comme rendue (ou non) directement côté serveur,
// pour éviter qu'un appareil resté ouvert avec des données périmées
// n'écrase par erreur des coches faites entre-temps par quelqu'un d'autre.

const NO_CACHE_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: "JSON invalide" }), {
      status: 400,
      headers: NO_CACHE_HEADERS,
    });
  }

  const id = body.id;
  const rendu = body.rendu !== undefined ? !!body.rendu : true;
  if (!id) {
    return new Response(JSON.stringify({ ok: false, error: "id manquant" }), {
      status: 400,
      headers: NO_CACHE_HEADERS,
    });
  }

  const row = await env.MAD_DB
    .prepare("SELECT value FROM app_data WHERE key = ?")
    .bind("reservations")
    .first();

  if (!row) {
    return new Response(JSON.stringify({ ok: false, error: "aucune donnée" }), {
      status: 404,
      headers: NO_CACHE_HEADERS,
    });
  }

  let list;
  try {
    list = JSON.parse(row.value);
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: "données corrompues" }), {
      status: 500,
      headers: NO_CACHE_HEADERS,
    });
  }

  const item = list.find((r) => r.id === id);
  if (!item) {
    return new Response(JSON.stringify({ ok: false, error: "réservation introuvable" }), {
      status: 404,
      headers: NO_CACHE_HEADERS,
    });
  }

  item.rendu = rendu;

  await env.MAD_DB
    .prepare(
      "INSERT INTO app_data (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
    .bind("reservations", JSON.stringify(list))
    .run();

  return new Response(JSON.stringify({ ok: true, reservations: list }), {
    headers: NO_CACHE_HEADERS,
  });
}
