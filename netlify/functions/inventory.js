function partnerToSteamID64(partner) {
  return (BigInt(partner) + 76561197960265728n).toString();
}

export async function handler(event) {
  const { tradeurl, steamid } = event.queryStringParameters || {};

  let steamid64 = steamid;

  // Se vier trade URL
  if (!steamid64 && tradeurl) {
    const match = tradeurl.match(/partner=(\d+)/);
    if (!match) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          ok: false,
          reason: "Trade URL inválida",
          items: []
        })
      };
    }
    steamid64 = partnerToSteamID64(match[1]);
  }

  if (!steamid64) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        ok: false,
        reason: "SteamID ou TradeURL não informado",
        items: []
      })
    };
  }

  const url = `https://steamcommunity.com/inventory/${steamid64}/730/2?l=english&count=5000`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      }
    });

    const text = await res.text();

    if (!text || text === "null") {
      return {
        statusCode: 403,
        body: JSON.stringify({
          ok: false,
          reason: "Inventário privado ou inexistente",
          steamid64,
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
        name: desc?.market_name || "Unknown",
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
        steamid64,
        total: items.length,
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
