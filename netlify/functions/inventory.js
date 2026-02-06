export async function handler(event) {
  const { steamid } = event.queryStringParameters || {};

  if (!steamid) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        ok: false,
        reason: "SteamID não informado",
        items: []
      })
    };
  }

  const url = `https://steamcommunity.com/inventory/${steamid}/730/2?l=english&count=5000`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      }
    });

    if (response.status === 403) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          ok: false,
          reason: "Inventário privado ou bloqueado",
          items: []
        })
      };
    }

    const text = await response.text();

    if (!text || text === "null") {
      return {
        statusCode: 400,
        body: JSON.stringify({
          ok: false,
          reason: "Steam retornou null",
          items: []
        })
      };
    }

    const data = JSON.parse(text);

    if (!data.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          ok: false,
          reason: "Steam não retornou sucesso",
          items: []
        })
      };
    }

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
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        items
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        reason: "Erro interno",
        error: err.message,
        items: []
      })
    };
  }
}
