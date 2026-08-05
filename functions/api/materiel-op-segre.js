// Fonction Cloudflare Pages : POST /api/materiel-op
// Applique une opération (créer / modifier) directement sur les matériels
// côté serveur, pour éviter qu'un appareil resté ouvert avec des données
// périmées n'écrase par erreur des modifications faites entre-temps.

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
    .bind("materiels")
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
    if (list.some((m) => m.id === item.id)) {
      return errResponse(409, "Conflit d'identifiant — réessaie (recharge la page si ça persiste).");
    }
    if (list.some((m) => m.nom.trim().toLowerCase() === item.nom.trim().toLowerCase())) {
      return errResponse(409, "Un matériel porte déjà ce nom.");
    }
    list.push(item);
  } else if (op === "update") {
    if (!id || !patch) return errResponse(400, "id ou patch manquant");
    const idx = list.findIndex((m) => m.id === id);
    if (idx === -1) return errResponse(404, "matériel introuvable");
    if (
      patch.nom &&
      list.some((m) => m.id !== id && m.nom.trim().toLowerCase() === patch.nom.trim().toLowerCase())
    ) {
      return errResponse(409, "Un autre matériel porte déjà ce nom.");
    }
    list[idx] = { ...list[idx], ...patch };
  } else {
    return errResponse(400, "opération inconnue");
  }

  await env.MAD_DB
    .prepare(
      "INSERT INTO app_data (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
    .bind("materiels", JSON.stringify(list))
    .run();

  return new Response(JSON.stringify({ ok: true, materiels: list }), {
    headers: NO_CACHE_HEADERS,
  });
}
