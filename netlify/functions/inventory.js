import fetch from "node-fetch";

export async function getSteamInventory(steamId64) {
  const url = `https://steamcommunity.com/inventory/${steamId64}/730/2?l=english&count=5000`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      }
    });

    if (response.status === 403) {
      return {
        ok: false,
        status: 403,
        reason: "Inventário privado ou Steam bloqueou a requisição",
        items: []
      };
    }

    const text = await response.text();

    if (!text || text === "null") {
      return {
        ok: false,
        status: 400,
        reason: "Steam retornou null (inventário privado ou indisponível)",
        items: []
      };
    }

    const data = JSON.parse(text);

    if (!data.success) {
      return {
        ok: false,
        status: 400,
        reason: "Steam não retornou sucesso",
        items: []
      };
    }

    // Mapeia itens
    const items = data.assets.map(asset => {
      const desc = data.descriptions.find(
        d =>
          d.classid === asset.classid &&
          d.instanceid === asset.instanceid
      );

      return {
        assetid: asset.assetid,
        classid: asset.classid,
        name: desc?.market_name || "Item desconhecido",
        icon: desc
          ? `https://community.cloudflare.steamstatic.com/economy/image/${desc.icon_url}`
          : null,
        tradable: desc?.tradable === 1
      };
    });

    return {
      ok: true,
      status: 200,
      items
    };
  } catch (err) {
    return {
      ok: false,
      status: 500,
      reason: "Erro interno ao consultar Steam",
      error: err.message,
      items: []
    };
  }
}
