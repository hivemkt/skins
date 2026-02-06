export async function handler(event) {
  try {
    const steamId = event.queryStringParameters?.steamid;
    if (!steamId) {
      return { statusCode: 400, body: JSON.stringify({ error: "steamid ausente" }) };
    }

    let assets = [];
    let descriptions = [];
    let startAssetId = "0";
    let more = true;

    while (more) {
      const url =
        `https://steamcommunity.com/inventory/${steamId}/730/2` +
        `?l=english&count=5000&start_assetid=${startAssetId}`;

      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "application/json",
          "Referer": "https://steamcommunity.com/"
        }
      });

      const text = await res.text();
      if (!text || text === "null") break;

      const data = JSON.parse(text);

      if (data.success !== 1) break;

      if (Array.isArray(data.assets)) {
        assets.push(...data.assets);
      }

      if (Array.isArray(data.descriptions)) {
        descriptions.push(...data.descriptions);
      }

      more = data.more_items === true;
      startAssetId = data.last_assetid;
    }

    if (assets.length === 0) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "Inventário vazio ou privado" })
      };
    }

    // 🔗 normalizar
    const descMap = {};
    for (const d of descriptions) {
      descMap[`${d.classid}_${d.instanceid}`] = d;
    }

    const items = assets
      .map(a => {
        const d = descMap[`${a.classid}_${a.instanceid}`];
        if (!d) return null;

        return {
          assetid: a.assetid,
          name: d.market_hash_name,
          image: `https://community.cloudflare.steamstatic.com/economy/image/${d.icon_url}/360fx360f`,
          tradable: d.tradable === 1,
          marketable: d.marketable === 1,
          type: d.type,
          rarity:
            d.tags?.find(t => t.category === "Rarity")
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
