const axios = require('axios');

const STEAM_BASE = 76561197960265728n;

exports.handler = async (event) => {
  console.log('EVENT:', event);

  try {
    if (event.httpMethod !== 'POST') {
      console.log('Método inválido:', event.httpMethod);
      return {
        statusCode: 405,
        body: 'Method Not Allowed'
      };
    }

    if (!event.body) {
      console.log('Body vazio');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Body vazio' })
      };
    }

    const parsedBody = JSON.parse(event.body);
    console.log('BODY PARSED:', parsedBody);

    const tradeUrl = parsedBody.tradeUrl;
    if (!tradeUrl) {
      console.log('Trade URL não enviada');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Trade URL não enviada' })
      };
    }

    const match = tradeUrl.match(/partner=(\d+)/);
    if (!match) {
      console.log('Trade URL inválida:', tradeUrl);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Trade URL inválida' })
      };
    }

    const partner = BigInt(match[1]);
    const steamid64 = (partner + STEAM_BASE).toString();
    console.log('STEAMID64:', steamid64);

    const url = `https://steamcommunity.com/inventory/${steamid64}/730/2?l=english&count=5000`;
    console.log('STEAM URL:', url);

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    console.log('STEAM STATUS:', response.status);

    return {
      statusCode: 200,
      body: JSON.stringify(response.data)
    };

  } catch (error) {
    console.error('ERRO REAL:', error);
    console.error('STACK:', error.stack);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Erro interno',
        message: error.message
      })
    };
  }
};
