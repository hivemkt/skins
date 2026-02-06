const axios = require("axios");

exports.handler = async (event) => {
  try {
    const steamId = event.queryStringParameters?.steamid;

    if (!steamId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "steamid é obrigatório" }),
      };
    }

    // CS2 = appid 730
    const url = `https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=5000`;

    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      },
      timeout: 10000
    });

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(response.data)
    };

  } catch (error) {
    console.error("STEAM ERROR:", error?.response?.data || error.message);

    return {
      statusCode: error.response?.status || 500,
      body: JSON.stringify({
        error: "Erro ao buscar inventário",
        details: error.response?.data || error.message
      })
    };
  }
};
