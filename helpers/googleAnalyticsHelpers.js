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

async function getValidAccessToken(userId) {
    const result = await pool.query(
        'SELECT access_token_googleanalytics, refresh_token_googleanalytics, expires_at FROM user_keys WHERE id_user = $1',
        [userId]
    );

    if (result.rows.length === 0) {
        throw new Error('Credenciais não encontradas para este usuário');
    }

    const { access_token_googleanalytics, refresh_token_googleanalytics, expires_at } = result.rows[0];
    const now = new Date();

    if (expires_at && new Date(expires_at) > now) {
        // Token ainda válido
        return access_token_googleanalytics;
    }

    // Token expirado: tentar refresh
    oauth2Client.setCredentials({
        refresh_token: refresh_token_googleanalytics
    });

    try {
        const { credentials } = await oauth2Client.refreshAccessToken(); // deprecated mas ainda funciona
        const newAccessToken = credentials.access_token;
        const newExpiresAt = new Date(Date.now() + credentials.expiry_date - Date.now());

        // Atualizar no banco
        console.log("atualizou expires_at do Google Analytics")
        await pool.query(
            `UPDATE user_keys
             SET access_token_googleanalytics = $1,
                 expires_at = $2
             WHERE id_user = $3`,
            [newAccessToken, newExpiresAt, userId]
        );

        return newAccessToken;
    } catch (err) {
        console.error('Erro ao fazer refresh do token:', err.response?.data || err.message);
        throw new Error('Não foi possível atualizar o token');
    }
}

async function getValidAccessTokenCustomer(id_customer) {
    const result = await pool.query(
        "SELECT access_token, refresh_token, expires_at FROM customer_integrations WHERE id_customer = $1 AND platform = 'google_analytics'",
        [id_customer]
    );

    if (result.rows.length === 0) throw new Error('Credenciais não encontradas para este cliente');

    const { access_token, refresh_token, expires_at } = result.rows[0];
    const now = new Date();

    if (expires_at && new Date(expires_at) > now) return access_token;

    oauth2Client.setCredentials({ refresh_token });

    try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        const newAccessToken = credentials.access_token;
        const newExpiresAt = new Date(Date.now() + (credentials.expiry_date ? (credentials.expiry_date - Date.now()) : (credentials.expires_in * 1000)));

        await pool.query(
            "UPDATE customer_integrations SET access_token = $1, expires_at = $2 WHERE id_customer = $3 AND platform = 'google_analytics'",
            [newAccessToken, newExpiresAt, id_customer]
        );

        return newAccessToken;
    } catch (err) {
        console.error('Erro ao fazer refresh do token (GA customer):', err.response?.data || err.message);
        throw new Error('Não foi possível atualizar o token');
    }
}

module.exports = { getValidAccessToken, getValidAccessTokenCustomer };
