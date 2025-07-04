// Arquivo: controllers/metaController.js
const axios = require('axios');
const querystring = require('querystring');
const { pool } = require('../config/db');
require('dotenv').config();

const META_APP_ID = '1832737137219562';//process.env.META_APP_ID;
const META_APP_SECRET = 'b14bc1778c11a716e69ac80c52199798';//process.env.META_APP_SECRET;
const REDIRECT_URI = 'https://www.hokoainalytics.com.br/api/meta/auth/callback';

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

  try {
    const tokenRes = await axios.get('https://graph.facebook.com/v22.0/oauth/access_token', {
      params: {
        client_id: META_APP_ID,
        client_secret: META_APP_SECRET,
        redirect_uri: REDIRECT_URI,
        code
      }
    });

    const shortLivedToken = tokenRes.data.access_token;

    const longTokenRes = await axios.get('https://graph.facebook.com/v22.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: META_APP_ID,
        client_secret: META_APP_SECRET,
        fb_exchange_token: shortLivedToken
      }
    });

    const longLivedToken = longTokenRes.data.access_token;

    const meRes = await axios.get('https://graph.facebook.com/v22.0/me', {
      params: { access_token: longLivedToken }
    });

    const metakUserId = meRes.data.id;

    await pool.query(
      `INSERT INTO user_keys (id_user, id_user_facebook, access_token_facebook, id_user_instagram, access_token_instagram)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id_user) DO UPDATE SET id_user_facebook = $2, access_token_facebook = $3, id_user_instagram = $2, access_token_instagram = $3`,
      [id_user, metakUserId, longLivedToken, metakUserId, longLivedToken]
    );

    return res.redirect('/platformsPage.html');
  } catch (error) {
    if (error.response) {
      console.error('Erro na resposta da API:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('Nenhuma resposta recebida:', error.request);
    } else {
      console.error('Erro ao configurar a requisição:', error.message);
    }
    return res.status(500).send('Erro ao conectar com o Facebook.');
  }
};

exports.getMetaPages = async (req, res) => {
  try {
    const { id } = req.user;
    //access_token_facebook = access_token_instagram
    const result = await pool.query('SELECT access_token_facebook FROM user_keys WHERE id_user = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Token do usuário não encontrado' });
    }

    const access_token = result.rows[0].access_token_facebook;

    // ================= FACEBOOK =================
    const fbRes = await axios.get('https://graph.facebook.com/v22.0/me/accounts', {
      params: { access_token }
    });

    const fbPages = fbRes.data.data.map(fbPage => ({
      name: fbPage.name,
      id_page: fbPage.id,
      access_token: fbPage.access_token
    }));

    // ================= INSTAGRAM =================
    const igPages = [];
    for (const fbPage of fbRes.data.data) {
      try {
        const igRes = await axios.get(
          `https://graph.facebook.com/v22.0/${fbPage.id}`,
          {
            params: {
              access_token: fbPage.access_token,
              fields: 'instagram_business_account{name,username,id}'
            }
          }
        );

        const igAccount = igRes.data.instagram_business_account;
        if (igAccount) {
          igPages.push({
            name: igAccount.name || igAccount.username,
            id_page: igAccount.id,
            access_token: fbPage.access_token
          });
        }
      } catch (err) {
        console.warn(`Página ${fbPage.id} sem conta IG vinculada ou erro ao buscar IG.`, err.response?.data || err.message);
        continue;
      }
    }

    res.json({ facebook: fbPages, instagram: igPages });
  } catch (error) {
    console.error('Erro ao buscar páginas:', error.response?.data || error.message);
    res.status(500).json({ message: 'Erro ao buscar páginas do Facebook/Instagram' });
  }
};

exports.checkMetaStatus = async (req, res) => {
  const id_user = req.user.id;

  try {
    const result = await pool.query(
      'SELECT access_token_facebook, access_token_instagram FROM user_keys WHERE id_user = $1',
      [id_user]
    );

    const row = result.rows[0] || {};
    const facebookConnected = row.access_token_facebook !== null && row.access_token_facebook !== undefined;
    const instagramConnected = row.access_token_instagram !== null && row.access_token_instagram !== undefined;

    res.json({ facebookConnected, instagramConnected });
  } catch (error) {
    console.error('Erro ao verificar status do Meta:', error);
    res.status(500).json({ facebookConnected: false, instagramConnected: false });
  }
};
