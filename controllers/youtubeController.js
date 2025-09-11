// Arquivo: controllers/youtubeController.js
const { google } = require('googleapis')
const { pool } = require('../config/db');
const { getValidYouTubeClient } = require('../helpers/youtubeHelpers');
require('dotenv').config();

const GOOGLE_CLIENT_ID = '950435540090-5afqh5jkq3b804ru5ej86s5q8g8gap20.apps.googleusercontent.com'
const GOOGLE_CLIENT_SECRET = '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'
const GOOGLE_REDIRECT_URI = 'https://www.hokoainalytics.com.br/api/youtube/auth/callback'

const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
);

exports.startOAuth = (req, res) => {
    const scopes = [
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/yt-analytics.readonly' //verificar se foi adicionado essa extensão no google cloude
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

    if (!code) return res.status(400).send('Código de autorização não encontrado.');

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
                id_user_youtube,
                access_token_youtube,
                refresh_token_youtube,
                expires_at_youtube
            ) VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (id_user) DO UPDATE SET
                id_user_youtube = EXCLUDED.id_user_youtube,
                access_token_youtube = EXCLUDED.access_token_youtube,
                refresh_token_youtube = EXCLUDED.refresh_token_youtube,
                expires_at_youtube = EXCLUDED.expires_at_youtube`,
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
            'SELECT access_token_youtube, id_user_youtube, refresh_token_youtube FROM user_keys WHERE id_user = $1',
            [id_user]
        );

        const row = result.rows[0] || {};
        const youtubeConnected = (row.access_token_youtube !== null && row.access_token_youtube !== undefined) && (row.id_user_youtube !== null && row.id_user_youtube !== undefined) && (row.refresh_token_youtube !== null && row.refresh_token_youtube !== undefined);

        res.json({ youtubeConnected });
    } catch (error) {
        console.error('Erro ao verificar status do Youtube:', error);
        res.status(500).json({ youtubeConnected: false });
    }
};


exports.getChannels = async (req, res) => {
    try {
        const userId = req.user.id;
        console.log("antes")
        const auth = await getValidYouTubeClient(userId);
        console.log("auth: ", auth)
        const yt = google.youtube({ version: 'v3', auth });
        const { data } = await yt.channels.list({
            part: ['snippet', 'statistics'],
            mine: true,
            maxResults: 50
        });

        const channels = (data.items || []).map(ch => ({
            id_channel: ch.id,
            title: ch.snippet?.title,
            customUrl: ch.snippet?.customUrl || null,
            thumbnail: ch.snippet?.thumbnails?.default?.url || null,
            subscriberCount: ch.statistics?.subscriberCount ? Number(ch.statistics.subscriberCount) : null,
            viewCount: ch.statistics?.viewCount ? Number(ch.statistics.viewCount) : null,
            videoCount: ch.statistics?.videoCount ? Number(ch.statistics.videoCount) : null
        }));

        return res.json({ youtube: channels });
    } catch (error) {
        console.error('Erro ao listar canais do YouTube:', error.response?.data || error.message);
        const status = error.status || error.response?.status || 500;
        const message = error.response?.data?.error?.message || error.message || 'Erro ao listar canais do YouTube';
        return res.status(status).json({ message });
    }
};