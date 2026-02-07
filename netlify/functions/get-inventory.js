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
    console.log('Buscando:', url);
    
    const data = await new Promise((resolve, reject) => {
      https.get(url, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      }, (res) => {
        console.log('Status:', res.statusCode);
        console.log('Headers:', res.headers);
        
        const chunks = [];
        
        // Criar stream de descompressão se necessário
        let stream = res;
        const encoding = res.headers['content-encoding'];
        
        if (encoding === 'gzip') {
          console.log('Descomprimindo gzip');
          stream = res.pipe(zlib.createGunzip());
        } else if (encoding === 'deflate') {
          console.log('Descomprimindo deflate');
          stream = res.pipe(zlib.createInflate());
        } else if (encoding === 'br') {
          console.log('Descomprimindo brotli');
          stream = res.pipe(zlib.createBrotliDecompress());
        }
        
        stream.on('data', chunk => chunks.push(chunk));
        
        stream.on('end', () => {
          try {
            const body = Buffer.concat(chunks).toString('utf8');
            console.log('Body length:', body.length);
            console.log('Body preview:', body.substring(0, 200));
            
            const jsonData = JSON.parse(body);
            console.log('JSON parseado com sucesso');
            console.log('Keys:', Object.keys(jsonData));
            
            resolve(jsonData);
          } catch (e) {
            console.error('Erro ao fazer parse:', e.message);
            console.error('Body recebido:', body.substring(0, 500));
            reject(new Error('Resposta inválida da Steam'));
          }
        });
        
        stream.on('error', (err) => {
          console.error('Erro no stream:', err.message);
          reject(err);
        });
        
      }).on('error', (err) => {
        console.error('Erro na requisição:', err.message);
        reject(err);
      });
    });

    console.log('Data recebido:', data ? 'OK' : 'NULL');
    
    if (!data) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Steam retornou resposta vazia' })
      };
    }

    // Verificar se tem erro da Steam
    if (data.error) {
      console.error('Erro da Steam:', data.error);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: data.error,
          message: 'Inventário privado ou erro da Steam'
        })
      };
    }

    // Verificar se tem assets
    if (!data.assets || data.assets.length === 0) {
      console.log('Nenhum asset encontrado');
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: 'Nenhum item encontrado',
          message: 'Inventário vazio ou privado'
        })
      };
    }

    console.log('Sucesso! Total de itens:', data.assets.length);

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
    console.error('Erro geral:', error.message);
    console.error('Stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Erro ao buscar inventário',
        message: error.message 
      })
    };
  }
};
