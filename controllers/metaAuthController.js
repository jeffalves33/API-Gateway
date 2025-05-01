// Arquivo: controllers/metaAuthController.js
const axios = require('axios');
const querystring = require('querystring');
const { pool } = require('../config/db');
require('dotenv').config();

const META_APP_ID = '1832737137219562';//process.env.META_APP_ID;
const META_APP_SECRET = 'b14bc1778c11a716e69ac80c52199798';//process.env.META_APP_SECRET;
const REDIRECT_URI = 'https://api-gateway-9qt5.onrender.com/auth/meta/callback';

exports.startOAuth = (req, res) => {
  const scopes = [
    'pages_show_list',
    'pages_read_engagement',
    'instagram_basic',
    'pages_read_user_content',
    'ads_management',
    'business_management'
  ];

  const authUrl = `https://www.facebook.com/v22.0/dialog/oauth?${querystring.stringify({
    client_id: META_APP_ID,
    redirect_uri: REDIRECT_URI,
    state: req.user.id, // associar com o id do usuário logado
    scope: scopes.join(',')
  })}`;

  res.redirect(authUrl);
};

exports.handleOAuthCallback = async (req, res) => {
  const { code, state: id_user } = req.query;

  console.log('⚙️ Callback iniciado');
  console.log('📥 code:', code);
  console.log('📥 id_user (state):', id_user);

  try {
    // Etapa 1 — Short-lived token
    console.log('🔗 Solicitando short-lived token...');
    const tokenRes = await axios.get('https://graph.facebook.com/v22.0/oauth/access_token', {
      params: {
        client_id: META_APP_ID,
        client_secret: META_APP_SECRET,
        redirect_uri: REDIRECT_URI,
        code
      }
    });
    console.log('✅ Short-lived token recebido:', tokenRes.data);

    const shortLivedToken = tokenRes.data.access_token;

    // Etapa 2 — Exchange para long-lived token
    console.log('🔗 Trocando por long-lived token...');
    const longTokenRes = await axios.get('https://graph.facebook.com/v22.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: META_APP_ID,
        client_secret: META_APP_SECRET,
        fb_exchange_token: shortLivedToken
      }
    });
    console.log('✅ Long-lived token recebido:', longTokenRes.data);

    const longLivedToken = longTokenRes.data.access_token;

    // Etapa 3 — Buscar ID do usuário Meta
    console.log('🔗 Buscando Meta user id...');
    const meRes = await axios.get('https://graph.facebook.com/v22.0/me', {
      params: { access_token: longLivedToken }
    });
    console.log('✅ Meta user id recebido:', meRes.data);

    const metakUserId = meRes.data.id;

    // Etapa 4 — Salvar no banco
    console.log('💾 Salvando no banco...');
    await pool.query(
      `INSERT INTO user_keys (id_user, id_user_meta, access_token_meta)
       VALUES ($1, $2, $3)
       ON CONFLICT (id_user) DO UPDATE SET id_user_meta = $2, access_token_meta = $3`,
      [id_user, metakUserId, longLivedToken]
    );
    console.log('✅ Salvo com sucesso no banco!');

    return res.redirect('/platformsPage.html');
  } catch (error) {
    if (error.response) {
      console.error('❌ Erro na resposta da API:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('❌ Nenhuma resposta recebida:', error.request);
    } else {
      console.error('❌ Erro ao configurar a requisição:', error.message);
    }
    return res.status(500).send('Erro ao conectar com o Facebook.');
  }
};

