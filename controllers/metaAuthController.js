// Arquivo: controllers/metaAuthController.js
const axios = require('axios');
const querystring = require('querystring');
const { pool } = require('../config/db');
require('dotenv').config();

const META_APP_ID = '1832737137219562';//process.env.META_APP_ID;
const META_APP_SECRET = 'b14bc1778c11a716e69ac80c52199798';//process.env.META_APP_SECRET;
const REDIRECT_URI = 'https://api-gateway-9qt5.onrender.com/auth/meta/callback';

// 1. Redirecionar para autorização
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

// 2. Callback após autorização
exports.handleOAuthCallback = async (req, res) => {
  const { code, state: id_user } = req.query;

  try {
    const tokenRes = await axios.get('https://graph.facebook.com/v22.0/oauth/access_token', {
      params: {
        client_id: META_APP_ID,
        client_secret: META_APP_SECRET,
        redirect_uri: REDIRECT_URI,
        code
      }
    });

    const access_token = tokenRes.data.access_token;

    // Buscar as páginas vinculadas à conta
    const pagesRes = await axios.get('https://graph.facebook.com/v22.0/me/accounts', {
      params: { access_token }
    });

    const firstPage = pagesRes.data.data?.[0];
    if (!firstPage) throw new Error('Nenhuma página vinculada encontrada.');

    const { id: page_id, access_token: page_token } = firstPage;
    console.log('firstPage: ', firstPage)

    // Salvar no banco (você pode adaptar essa query/tabela)
    /*await pool.query(
      'UPDATE "user" SET facebook_access_token = $1, facebook_page_id = $2 WHERE id_user = $3',
      [page_token, page_id, id_user]
    );*/

    return res.redirect('/platformsPage.html');
  } catch (error) {
    console.error('Erro ao finalizar OAuth do Meta:', error.response?.data || error.message);
    return res.status(500).send('Erro ao conectar com o Facebook.');
  }
};
