const fetch = require('node-fetch');

const STEAM_BASE = 76561197960265728n;

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { tradeUrl } = JSON.parse(event.body || '{}');

    const match = tradeUrl?.match(/partner=(\d+)/);
    if (!match) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Trade URL inválida' })
      };
    }

    const steamid64 = (BigInt(match[1]) + STEAM_BASE).toString();
    const url = `https://steamcommunity.com/inventory/${steamid64}/730/2?l=english&count=5000`;

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://steamcommunity.com/'
      },
      timeout: 10000
    });

    if (!res.ok) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          private: true,
          message: 'Inventário privado ou indisponível'
        })
      };
    }

    const data = await res.json();

    if (!data?.assets) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          private: true,
          message: 'Inventário vazio ou bloqueado'
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };

  } catch (err) {
    console.error('ERRO FINAL:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro interno' })
    };
  }
};
