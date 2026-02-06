export async function handler(event) {
  try {
    const steamId = event.queryStringParameters?.steamid;

    if (!steamId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "steamid ausente" })
      };
    }

    const url = `https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=5000`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
        "Referer": "https://steamcommunity.com/"
      }
    });

    // 🚨 Steam retorna 400 quando inventário é privado
    if (!response.ok) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          error: "Inventário privado ou indisponível",
          status: response.status
        })
      };
    }

    const data = await response.json();

    // Steam pode retornar null
    if (!data || !data.assets || !data.descriptions) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          error: "Inventário privado ou vazio"
        })
      };
    }

    // 🔗 normalização assets + descriptions
    const descriptionsMap = {};
    for (const d of data.descriptions) {
      descriptionsMap[`${d.classid}_${d.instanceid}`] = d;
    }

    const items = data.assets.map(asset => {
      const key = `${asset.classid}_${asset.instanceid}`;
      const desc = descriptionsMap[key];

      if (!desc) return null;

      return {
        assetid: asset.assetid,
        name: desc.market_hash_name,
        image: `https://community.cloudflare.steamstatic.com/economy/image/${desc.icon_url}/360fx360f`,
        tradable: desc.tradable === 1,
        marketable: desc.marketable === 1,
        rarity: desc.tags?.find(t => t.category === "Rarity")?.localized_tag_name || "Unknown",
        type: desc.type
      };
    }).filter(Boolean);

    return {
      statusCode: 200,
      body: JSON.stringify({
        total: items.length,
        items
      })
    };

  } catch (err) {
    console.error("ERRO REAL:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Erro interno",
        details: err.message
      })
    };
  }
}
