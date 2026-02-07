// netlify/functions/get-inventory.js
const https = require('https');

exports.handler = async (event, context) => {
  // Configurar CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Responder OPTIONS para CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Pegar SteamID da query string
    const steamId = event.queryStringParameters?.steamId;
    
    if (!steamId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'SteamID não fornecido',
          message: 'Use: ?steamId=SEU_STEAMID'
        })
      };
    }

    // Buscar inventário da Steam usando https nativo
    const steamUrl = `https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=5000`;
    
    console.log('Buscando inventário:', steamUrl);

    const data = await new Promise((resolve, reject) => {
      const req = https.get(steamUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 15000
      }, (res) => {
        let body = '';

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          try {
            const jsonData = JSON.parse(body);
            resolve({ statusCode: res.statusCode, data: jsonData });
          } catch (e) {
            console.error('Erro ao fazer parse do JSON:', e.message);
            console.error('Resposta recebida:', body.substring(0, 200));
            reject(new Error('Resposta inválida da Steam'));
          }
        });
      });

      req.on('error', (err) => {
        console.error('Erro na requisição:', err.message);
        reject(err);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout ao conectar com a Steam'));
      });
    });

    console.log('Status code:', data.statusCode);

    if (data.statusCode !== 200) {
      return {
        statusCode: data.statusCode,
        headers,
        body: JSON.stringify({ 
          error: `Steam retornou status ${data.statusCode}`,
          message: 'Verifique se o inventário está público'
        })
      };
    }

    // Verificar se há erro na resposta
    if (data.data.error) {
      console.error('Erro da Steam:', data.data.error);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: data.data.error,
          message: 'Inventário pode estar privado ou vazio'
        })
      };
    }

    // Verificar se tem itens
    if (!data.data.assets || data.data.assets.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: 'Nenhum item encontrado',
          message: 'Verifique se você tem itens de CS2 no inventário'
        })
      };
    }

    console.log('Sucesso! Total de itens:', data.data.assets.length);

    // Retornar dados do inventário
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        totalItems: data.data.assets.length,
        data: data.data
      })
    };

  } catch (error) {
    console.error('Erro geral:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Erro ao buscar inventário',
        message: error.message,
        details: 'Verifique os logs da função no Netlify'
      })
    };
  }
};
