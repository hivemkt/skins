const axios = require('axios');

const STEAM_BASE = BigInt('76561197960265728');

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const tradeUrl = body.tradeUrl;

    const partnerMatch = tradeUrl.match(/partner=(\d+)/);
    if (!partnerMatch) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Trade URL inválida' })
      };
    }

    const partner = BigInt(partnerMatch[1]);
    const steamid64 = (partner + STEAM_BASE).toString();

    const steamUrl = `https://steamcommunity.com/inventory/${steamid64}/730/2?l=english&count=5000`;

    const response = await axios.get(steamUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify(response.data)
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro ao buscar inventário' })
    };
  }
};
