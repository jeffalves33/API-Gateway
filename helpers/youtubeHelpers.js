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

async function getValidYouTubeClientCustomer(id_customer) {
    const { rows } = await pool.query(
        "SELECT access_token, refresh_token, expires_at FROM customer_integrations WHERE id_customer = $1 AND platform = 'youtube'",
        [id_customer]
    );

    const row = rows[0];
    if (!row || !row.refresh_token) { const err = new Error('Conta do YouTube não autorizada para este cliente.'); err.status = 401; throw err; }

    const expiryMs = row.expires_at ? new Date(row.expires_at).getTime() : 0;

    oauth2Client.setCredentials({
        access_token: row.access_token || undefined,
        refresh_token: row.refresh_token,
        expiry_date: expiryMs || undefined
    });

    const needsRefresh = !row.access_token || Date.now() >= (expiryMs - 60_000);
    if (needsRefresh) {
        const { tokens } = await oauth2Client.refreshToken(row.refresh_token);
        const accessToken = tokens.access_token || row.access_token;
        const newExpiryMs = tokens.expiry_date || null;

        oauth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: row.refresh_token,
            expiry_date: newExpiryMs || undefined
        });

        await pool.query(
            "UPDATE customer_integrations SET access_token = $1, expires_at = $2 WHERE id_customer = $3 AND platform = 'youtube'",
            [accessToken, newExpiryMs ? new Date(newExpiryMs) : null, id_customer]
        );
    }

    return oauth2Client;
}

module.exports = { getValidYouTubeClientCustomer };
