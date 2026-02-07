const https = require('https');
const zlib = require('zlib');

exports.handler = async (event) => {
  // Headers CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const steamId = event.queryStringParameters?.steamId;
  
  if (!steamId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'SteamID obrigatório' })
    };
  }

  try {
    const url = `https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=5000`;
    
    const data = await new Promise((resolve, reject) => {
      https.get(url, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Encoding': 'gzip, deflate, br'
        }
      }, (res) => {
        const chunks = [];
        
        // Criar stream de descompressão se necessário
        let stream = res;
        const encoding = res.headers['content-encoding'];
        
        if (encoding === 'gzip') {
          stream = res.pipe(zlib.createGunzip());
        } else if (encoding === 'deflate') {
          stream = res.pipe(zlib.createInflate());
        } else if (encoding === 'br') {
          stream = res.pipe(zlib.createBrotliDecompress());
        }
        
        stream.on('data', chunk => chunks.push(chunk));
        
        stream.on('end', () => {
          try {
            const body = Buffer.concat(chunks).toString('utf8');
            const jsonData = JSON.parse(body);
            resolve(jsonData);
          } catch (e) {
            console.error('Erro ao fazer parse:', e.message);
            reject(new Error('Resposta inválida'));
          }
        });
        
        stream.on('error', (err) => {
          console.error('Erro no stream:', err.message);
          reject(err);
        });
        
      }).on('error', reject);
    });

    if (!data.assets || data.assets.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Sem itens no inventário' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        totalItems: data.assets.length,
        data: data
      })
    };

  } catch (error) {
    console.error('Erro:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
