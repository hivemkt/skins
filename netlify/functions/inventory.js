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

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
        "Referer": "https://steamcommunity.com/"
      }
    });

    const raw = await res.text();

    // 🚨 ÚNICO caso de erro real
    if (!raw || raw === "null") {
      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: false,
          reason: "Steam retornou null",
          items: []
        })
      };
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: false,
          reason: "Resposta não JSON da Steam",
          raw
        })
      };
    }

    // 🔎 se não tiver assets, DEVOLVE MESMO ASSIM
    if (!Array.isArray(data.assets) || !Array.isArray(data.descriptions)) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          note: "JSON válido, mas sem assets ainda",
          steam: data
        })
      };
    }

    // 🔗 normalização segura
    const descMap = {};
    for (const d of data.descriptions) {
      descMap[`${d.classid}_${d.instanceid}`] = d;
    }

    const items = data.assets.map(a => {
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
    }).filter(Boolean);

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
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
