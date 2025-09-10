// Arquivo: controllers/googleAnalyticsController.js
const { google } = require('googleapis')
const axios = require('axios');
const querystring = require('querystring');
const { pool } = require('../config/db');
const { getValidAccessToken } = require('../helpers/googleAnalyticsHelpers');
require('dotenv').config();

const GOOGLE_CLIENT_ID = '950435540090-5afqh5jkq3b804ru5ej86s5q8g8gap20.apps.googleusercontent.com'
const GOOGLE_CLIENT_SECRET = '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'
const GOOGLE_REDIRECT_URI = 'https://www.hokoainalytics.com.br/api/googleAnalytics/auth/callback'

const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
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

        const expiresInSeconds = tokens.expiry_date
            ? (tokens.expiry_date - Date.now()) / 1000
            : tokens.expires_in;

        const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

        const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
        const { data: userInfo } = await oauth2.userinfo.get();

        await pool.query(
            `INSERT INTO user_keys (
                id_user,
                id_user_googleAnalytics,
                access_token_googleAnalytics,
                refresh_token_googleAnalytics,
                expires_at
            ) VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (id_user) DO UPDATE SET
                id_user_googleAnalytics = EXCLUDED.id_user_googleAnalytics,
                access_token_googleAnalytics = EXCLUDED.access_token_googleAnalytics,
                refresh_token_googleAnalytics = EXCLUDED.refresh_token_googleAnalytics,
                expires_at = EXCLUDED.expires_at`,
            [id_user, userInfo.id, tokens.access_token, tokens.refresh_token, expiresAt]
        );

        return res.redirect('/platformsPage.html');
    } catch (error) {
        console.error('Erro ao obter tokens:', error.response?.data || error);
        return res.status(500).send('Erro ao autenticar com o Google');
    }
};

exports.checkStatus = async (req, res) => {
    const id_user = req.user.id;

    try {
        const result = await pool.query(
            'SELECT access_token_googleanalytics, id_user_googleanalytics, refresh_token_googleanalytics, expires_at FROM user_keys WHERE id_user = $1',
            [id_user]
        );

        const row = result.rows[0] || {};
        const googleAnalyticsConnected = (row.access_token_googleanalytics !== null && row.access_token_googleanalytics !== undefined) && (row.id_user_googleanalytics !== null && row.id_user_googleanalytics !== undefined) && (row.refresh_token_googleanalytics !== null && row.refresh_token_googleanalytics !== undefined);

        let gaDaysLeft = null;
        let needsReauthGA = false;
        if (row.expires_at) {
            const diff = new Date(row.expires_at) - Date.now();
            gaDaysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
            needsReauthGA = gaDaysLeft <= 7;
        }

        res.json({ googleAnalyticsConnected, gaDaysLeft, needsReauthGA });
    } catch (error) {
        console.error('Erro ao verificar status do Google Analyticss:', error);
        res.status(500).json({ googleAnalyticsConnected: false });
    }
};

exports.getProperties = async (req, res) => {
    try {
        const { id } = req.user;

        const accessToken = await getValidAccessToken(id);

        const gaRes = await axios.get(
            'https://analyticsadmin.googleapis.com/v1beta/accountSummaries',
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        );

        const properties = [];
        gaRes.data.accountSummaries.forEach(account => {
            account.propertySummaries.forEach(property => {
                properties.push({
                    id_property: property.property,
                    propertyIdNumber: property.property.split('/')[1],
                    displayName: property.displayName
                });
            });
        });

        res.json({ google: properties });
    } catch (error) {
        console.error('Erro ao buscar propriedades do Google Analytics:', error.response?.data || error.message);

        const status = error.response?.status || 500;
        const message = error.response?.data?.error?.message || 'Erro ao buscar propriedades do Google Analytics';

        res.status(status).json({ message });
    }
};