export async function handler(event) {
  try {
    const steamId = event.queryStringParameters?.steamid;

    if (!steamId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "steamid ausente" })
      };
    }

    const url =
      `https://steamcommunity.com/inventory/${steamId}/730/2` +
      `?l=english&count=5000&start_assetid=0`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "application/json,text/plain,*/*",
        "Accept-Encoding": "gzip",
        "Referer": "https://steamcommunity.com/my/inventory/"
      }
    });

    // Steam costuma responder 400 mesmo com inventário público
    const rawText = await response.text();

    if (!rawText || rawText === "null") {
      return {
        statusCode: 403,
        body: JSON.stringify({
          error: "Inventário privado ou vazio"
        })
      };
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: "Resposta inválida da Steam"
        })
      };
    }

    if (!data.assets || !data.descriptions) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          error: "Inventário indisponível"
        })
      };
    }

    // 🔗 normalização
    const descMap = {};
    for (const d of data.descriptions) {
      descMap[`${d.classid}_${d.instanceid}`] = d;
    }

    const items = data.assets
      .map(asset => {
        const desc = descMap[`${asset.classid}_${asset.instanceid}`];
        if (!desc) return null;

        return {
          assetid: asset.assetid,
          name: desc.market_hash_name,
          image: `https://community.cloudflare.steamstatic.com/economy/image/${desc.icon_url}/360fx360f`,
          tradable: desc.tradable === 1,
          marketable: desc.marketable === 1,
          type: desc.type,
          rarity:
            desc.tags?.find(t => t.category === "Rarity")
              ?.localized_tag_name || "Unknown"
        };
      })
      .filter(Boolean);

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
