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
    'ads_management',
    'business_management',
    'instagram_basic',
    'instagram_manage_insights',
    'read_insights',
    'pages_read_engagement',
    'pages_read_user_content',
    'pages_show_list',
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
    const llExpiresIn = Number(longTokenRes.data.expires_in);

    let metaExpiresAt = null;
    try {
      const dbg = await axios.get('https://graph.facebook.com/v22.0/debug_token', {
        params: {
          input_token: longLivedToken,
          access_token: `${META_APP_ID}|${META_APP_SECRET}`
        }
      });
      const d = dbg.data?.data || {};
      console.log("🚀 ~ exports.handleOAuthCallback= ~ d: ", d)
      if (d.expires_at) {
        metaExpiresAt = new Date(d.expires_at * 1000);
        console.log("🚀 ~ exports.handleOAuthCallback if= ~ metaExpiresAt: ", metaExpiresAt)
      } else if (!Number.isNaN(llExpiresIn) && llExpiresIn > 0) {
        metaExpiresAt = new Date(Date.now() + llExpiresIn * 1000);
        console.log("🚀 ~ exports.handleOAuthCallback elif= ~ metaExpiresAt: ", metaExpiresAt)
      }
    } catch (_) {
      if (!Number.isNaN(llExpiresIn) && llExpiresIn > 0) {
        metaExpiresAt = new Date(Date.now() + llExpiresIn * 1000);
        console.log("🚀 ~ exports.handleOAuthCallback catch= ~ metaExpiresAt: ", metaExpiresAt)
      }
    }

    const meRes = await axios.get('https://graph.facebook.com/v22.0/me', {
      params: { access_token: longLivedToken }
    });
    const metakUserId = meRes.data.id;

    await pool.query(
      `INSERT INTO user_keys (
         id_user, id_user_facebook, access_token_facebook,
         id_user_instagram, access_token_instagram,
         expires_at_facebook, expires_at_instagram
       ) VALUES ($1,$2,$3,$4,$5,$6,$6)
       ON CONFLICT (id_user) DO UPDATE SET
         id_user_facebook       = EXCLUDED.id_user_facebook,
         access_token_facebook  = EXCLUDED.access_token_facebook,
         id_user_instagram      = EXCLUDED.id_user_instagram,
         access_token_instagram = EXCLUDED.access_token_instagram,
         expires_at_facebook    = COALESCE(EXCLUDED.expires_at_facebook, user_keys.expires_at_facebook),
         expires_at_instagram   = COALESCE(EXCLUDED.expires_at_instagram, user_keys.expires_at_instagram)`,
      [id_user, metakUserId, longLivedToken, metakUserId, longLivedToken, metaExpiresAt]
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
    const result = await pool.query('SELECT access_token_facebook FROM user_keys WHERE id_user = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Token do usuário não encontrado' });
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
      `SELECT access_token_facebook, access_token_instagram, expires_at_facebook, expires_at_instagram FROM user_keys WHERE id_user = $1`,
      [id_user]
    );

    const row = result.rows[0] || {};
    const facebookConnected = row.access_token_facebook !== null && row.access_token_facebook !== undefined;
    const instagramConnected = row.access_token_instagram !== null && row.access_token_instagram !== undefined;

    let facebookDaysLeft = null, needsReauthFacebook = false;
    if (row.expires_at_facebook) {
      const diff = new Date(row.expires_at_facebook) - Date.now();
      facebookDaysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
      needsReauthFacebook = facebookDaysLeft <= 7;
    }

    let instagramDaysLeft = null, needsReauthInstagram = false;
    if (row.expires_at_instagram) {
      const diffIG = new Date(row.expires_at_instagram) - Date.now();
      instagramDaysLeft = Math.ceil(diffIG / (1000 * 60 * 60 * 24));
      needsReauthInstagram = instagramDaysLeft <= 7;
    }

    res.json({
      facebookConnected, instagramConnected,
      facebookDaysLeft, needsReauthFacebook,
      instagramDaysLeft, needsReauthInstagram
    });

  } catch (error) {
    console.error('Erro ao verificar status do Meta:', error);
    res.status(500).json({ facebookConnected: false, instagramConnected: false });
  }
};
