// Arquivo: controllers/googleAnalyticsController.js
const { google } = require('googleapis')
const axios = require('axios');
const querystring = require('querystring');
const { pool } = require('../config/db');
require('dotenv').config();

const GOOGLE_CLIENT_ID = '950435540090-5afqh5jkq3b804ru5ej86s5q8g8gap20.apps.googleusercontent.com'
const GOOGLE_CLIENT_SECRET = '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'
const GOOGLE_REDIRECT_URI = 'https://api-gateway-9qt5.onrender.com/api/googleAnalytics/auth/callback'

const oauth2Client = new google.auth.OAuth2(
    '950435540090-5afqh5jkq3b804ru5ej86s5q8g8gap20.apps.googleusercontent.com',
    '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',
    'https://api-gateway-9qt5.onrender.com/api/googleAnalytics/auth/callback'
);

exports.startOAuth = (req, res) => {
    const scopes = [
        'https://www.googleapis.com/auth/analytics.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent',
        state: req.user.id
    });

    res.redirect(authUrl);
};

exports.handleOAuthCallback = async (req, res) => {
    const { code, state: id_user } = req.query;

    if (!code) {
        return res.status(400).send('Código de autorização não encontrado.');
    }

    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
        const { data: userInfo } = await oauth2.userinfo.get();

        await pool.query(
            `INSERT INTO user_keys (
                id_user,
                id_user_googleAnalytics,
                access_token_googleAnalytics,
                refresh_token_googleAnalytics
            ) VALUES ($1, $2, $3, $4)
            ON CONFLICT (id_user) DO UPDATE SET
                id_user_googleAnalytics = EXCLUDED.id_user_googleAnalytics,
                access_token_googleAnalytics = EXCLUDED.access_token_googleAnalytics,
                refresh_token_googleAnalytics = EXCLUDED.refresh_token_googleAnalytics`,
            [id_user, userInfo.id, tokens.access_token, tokens.refresh_token]
        );

        return res.redirect('/platformsPage.html');
    } catch (error) {
        console.error('Erro ao obter tokens:', error.response?.data || error);
        return res.status(500).send('Erro ao autenticar com o Google');
    }
};


