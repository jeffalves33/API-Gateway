// Arquivo: helpers/youtubeHelpers.js
const { google } = require('googleapis');
const { pool } = require('../config/db');

const GOOGLE_CLIENT_ID = '950435540090-5afqh5jkq3b804ru5ej86s5q8g8gap20.apps.googleusercontent.com'
const GOOGLE_CLIENT_SECRET = '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'
const GOOGLE_REDIRECT_URI = 'https://www.hokoainalytics.com.br/api/googleAnalytics/auth/callback'

const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
);

async function getValidYouTubeClient(userId) {
    // Busca tokens no DB
    const { rows } = await pool.query(
        `SELECT access_token_youtube, refresh_token_youtube, expires_at_youtube FROM user_keys WHERE id_user = $1`,
        [userId]
    );
    const row = rows[0];
    if (!row || !row.refresh_token_youtube) {
        const err = new Error('Conta do YouTube não conectada.');
        err.status = 401;
        throw err;
    }

    const expiry = row.expires_at_youtube ? new Date(row.expires_at_youtube).getTime() : 0;
    oauth2Client.setCredentials({
        access_token: row.access_token_youtube || undefined,
        refresh_token: row.refresh_token_youtube,
        expiry_date: expiry || undefined
    });

    // Se expirado ou sem access_token, renova
    const needsRefresh = !row.access_token_youtube || Date.now() >= (expiry - 60_000);
    if (needsRefresh) {
        const { tokens } = await oauth2Client.refreshToken(row.refresh_token_youtube);
        // tokens.expiry_date vem em ms desde epoch
        const accessToken = tokens.access_token || row.access_token_youtube;
        const newExpiryMs = tokens.expiry_date || null;

        // garanta que o client já está com as credenciais novas
        oauth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: row.refresh_token_youtube,
            expiry_date: newExpiryMs || undefined
        });

        await pool.query(
            `UPDATE user_keys
            SET access_token_youtube = $1,
                expires_at_youtube   = $2
            WHERE id_user = $3`,
            [accessToken, newExpiryMs ? new Date(newExpiryMs) : null, userId]
        );
    }
    return oauth2Client;
}

module.exports = { getValidYouTubeClient };
