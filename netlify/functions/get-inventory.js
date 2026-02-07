const https = require('https');
const zlib = require('zlib');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      }, (res) => {
        console.log('Status code:', res.statusCode);
        console.log('Content-Encoding:', res.headers['content-encoding']);
        
        const chunks = [];
        let stream = res;
        const encoding = res.headers['content-encoding'];
        
        if (encoding === 'gzip') {
          console.log('Descomprimindo gzip...');
          stream = res.pipe(zlib.createGunzip());
        } else if (encoding === 'deflate') {
          console.log('Descomprimindo deflate...');
          stream = res.pipe(zlib.createInflate());
        }
        
        stream.on('data', chunk => {
          chunks.push(chunk);
        });
        
        stream.on('end', () => {
          try {
            const bodyText = Buffer.concat(chunks).toString('utf8');
            console.log('Body length:', bodyText.length);
            console.log('Body start:', bodyText.substring(0, 100));
            
            if (!bodyText || bodyText.length === 0) {
              reject(new Error('Resposta vazia da Steam'));
              return;
            }
            
            const jsonData = JSON.parse(bodyText);
            console.log('JSON parseado! Keys:', Object.keys(jsonData));
            
            if (jsonData.success === false) {
              console.log('Success = false');
            }
            
            resolve(jsonData);
          } catch (parseError) {
            console.error('Erro no parse:', parseError.message);
            reject(new Error('JSON inválido da Steam'));
          }
        });
        
        stream.on('error', (streamError) => {
          console.error('Erro no stream:', streamError.message);
          reject(streamError);
        });
        
      }).on('error', (reqError) => {
        console.error('Erro na requisição:', reqError.message);
        reject(reqError);
      });
    });

    console.log('Data type:', typeof data);
    console.log('Data null?', data === null);
    console.log('Has assets?', data && 'assets' in data);
    
    if (!data) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Resposta vazia da Steam' })
      };
    }

    if (data.error) {
      console.error('Steam error:', data.error);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: data.error,
          message: 'Inventário privado ou inacessível'
        })
      };
    }

    if (!data.assets || data.assets.length === 0) {
      console.log('Sem assets');
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: 'Nenhum item encontrado',
          message: 'Inventário vazio ou privado'
        })
      };
    }

    console.log('✅ Sucesso! Total:', data.assets.length);

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
    console.error('❌ Erro geral:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message
      })
    };
  }
};
