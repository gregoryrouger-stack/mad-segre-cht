// Fonction Cloudflare Pages : POST /api/reservation-op
// Applique une opération (créer / modifier / supprimer / renommer un matériel
// sur toutes ses réservations) directement sur les données côté serveur,
// pour éviter qu'un appareil resté ouvert avec des données périmées
// n'écrase par erreur des modifications faites entre-temps par quelqu'un d'autre.

const NO_CACHE_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

function errResponse(status, error) {
  return new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: NO_CACHE_HEADERS,
  });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return errResponse(400, "JSON invalide");
  }

  const { op, id, patch, item } = body;
  if (!op) return errResponse(400, "opération manquante");

  const row = await env.MAD_DB
    .prepare("SELECT value FROM app_data WHERE key = ?")
    .bind("reservations")
    .first();

  let list = [];
  if (row) {
    try {
      list = JSON.parse(row.value);
    } catch (e) {
      return errResponse(500, "données corrompues");
    }
  }

  if (op === "create") {
    if (!item || !item.id) return errResponse(400, "item manquant");
    list.push(item);
  } else if (op === "update") {
    if (!id || !patch) return errResponse(400, "id ou patch manquant");
    const idx = list.findIndex((r) => r.id === id);
    if (idx === -1) return errResponse(404, "réservation introuvable");
    list[idx] = { ...list[idx], ...patch };
  } else if (op === "delete") {
    if (!id) return errResponse(400, "id manquant");
    list = list.filter((r) => r.id !== id);
  } else if (op === "rename-materiel") {
    const { oldName, newName, newIcone } = patch || {};
    if (!oldName || !newName) return errResponse(400, "oldName/newName manquant");
    list.forEach((r) => {
      if (r.materiel && r.materiel.trim().toLowerCase() === oldName.trim().toLowerCase()) {
        r.materiel = newName;
        if (newIcone) r.icone = newIcone;
      }
    });
  } else {
    return errResponse(400, "opération inconnue");
  }

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
