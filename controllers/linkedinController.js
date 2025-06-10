// Arquivo: controllers/metaController.js
const axios = require('axios');
const querystring = require('querystring');
const { pool } = require('../config/db');
require('dotenv').config();

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

