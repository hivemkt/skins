function partnerToSteamID64(partner) {
  return (BigInt(partner) + 76561197960265728n).toString();
}

export async function handler(event) {
  try {
    const params = event.queryStringParameters || {};
    let steamid64 = params.steamid;

    if (!steamid64 && params.tradeurl) {
      const match = params.tradeurl.match(/partner=(\d+)/);
      if (!match) {
        return response(400, "Trade URL inválida");
      }
      steamid64 = partnerToSteamID64(match[1]);
    }

    if (!steamid64) {
      return response(400, "SteamID ou TradeURL ausente");
    }

    const url = `https://steamcommunity.com/inventory/${steamid64}/730/2?l=english&count=5000`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      }
    });

    const text = await res.text();

    if (!text || text === "null") {
      return response(403, "Inventário privado ou inexistente");
    }

    const data = JSON.parse(text);

    if (!data.success) {
      return response(400, "Steam não retornou sucesso");
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
        error: err.message
      })
    };
  }
}

function response(status, reason) {
  return {
    statusCode: status,
    body: JSON.stringify({
      ok: false,
      reason,
      items: []
    })
  };
}
