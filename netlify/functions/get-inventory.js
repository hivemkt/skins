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
    console.log('📡 URL:', url);
    
    const data = await new Promise((resolve, reject) => {
      const req = https.get(url, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': '*/*'
        }
      }, (res) => {
        console.log('📊 Status:', res.statusCode);
        console.log('📦 Content-Type:', res.headers['content-type']);
        console.log('🗜️ Content-Encoding:', res.headers['content-encoding']);
        
        const chunks = [];
        let responseStream = res;
        
        // Só descomprimir se necessário
        if (res.headers['content-encoding'] === 'gzip') {
          console.log('✅ Descomprimindo GZIP');
          responseStream = res.pipe(zlib.createGunzip());
        } else if (res.headers['content-encoding'] === 'deflate') {
          console.log('✅ Descomprimindo DEFLATE');
          responseStream = res.pipe(zlib.createInflate());
        } else {
          console.log('⚪ Sem compressão');
        }
        
        responseStream.on('data', chunk => {
          console.log('📥 Chunk recebido:', chunk.length, 'bytes');
          chunks.push(chunk);
        });
        
        responseStream.on('end', () => {
          console.log('✅ Stream finalizado');
          console.log('📊 Total de chunks:', chunks.length);
          
          if (chunks.length === 0) {
            console.error('❌ Nenhum chunk recebido!');
            reject(new Error('Resposta vazia'));
            return;
          }
          
          try {
            const buffer = Buffer.concat(chunks);
            console.log('📦 Buffer total:', buffer.length, 'bytes');
            
            const text = buffer.toString('utf8');
            console.log('📝 Text length:', text.length);
            console.log('👀 Primeiros 200 chars:', text.substring(0, 200));
            console.log('👀 Últimos 100 chars:', text.substring(text.length - 100));
            
            // Tentar parse
            const json = JSON.parse(text);
            console.log('✅ JSON parseado!');
            console.log('🔑 Keys:', Object.keys(json).join(', '));
            console.log('📊 Has assets?', !!json.assets);
            console.log('📊 Assets length?', json.assets?.length);
            
            resolve(json);
            
          } catch (parseErr) {
            console.error('❌ Erro no parse JSON:', parseErr.message);
            console.error('❌ Parse stack:', parseErr.stack);
            reject(new Error('Falha ao parsear JSON'));
          }
        });
        
        responseStream.on('error', (err) => {
          console.error('❌ Erro no stream:', err.message);
          reject(err);
        });
      });
      
      req.on('error', (err) => {
        console.error('❌ Erro na request:', err.message);
        reject(err);
      });
      
      req.setTimeout(10000, () => {
        console.error('❌ Timeout!');
        req.destroy();
        reject(new Error('Timeout'));
      });
    });

    console.log('🎉 Dados recebidos com sucesso!');
    
    if (!data || typeof data !== 'object') {
      console.error('❌ Data não é objeto válido');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Resposta inválida da Steam' })
      };
    }

    if (data.error) {
      console.log('⚠️ Steam retornou erro:', data.error);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: data.error,
          message: 'Inventário privado ou inacessível'
        })
      };
    }

    if (!data.assets || !Array.isArray(data.assets) || data.assets.length === 0) {
      console.log('⚠️ Sem assets');
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: 'Nenhum item encontrado'
        })
      };
    }

    console.log('🎮 Total de itens:', data.assets.length);

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
    console.error('💥 ERRO FINAL:', error.message);
    console.error('💥 Stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message || 'Erro desconhecido'
      })
    };
  }
};
