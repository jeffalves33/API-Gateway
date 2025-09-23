// Arquivo: helpers/linkedinHelpers.js
const axios = require('axios');
const querystring = require('querystring');
const { pool } = require('../config/db');

const LINKEDIN_CLIENT_ID = '77b662p87zgthq';
const LINKEDIN_CLIENT_SECRET = 'WPL_AP1.xnVHxAwFB1tPCa0Y.D3jxLA==';
const LINKEDIN_API_VERSION = '202508';

async function getValidLinkedInAccessToken(id_user) {
    const { rows } = await pool.query(
        `SELECT access_token_linkedin, refresh_token_linkedin, expires_at_linkedin FROM user_keys WHERE id_user = $1`,
        [id_user]
    );
    if (!rows.length) throw new Error('Sem credenciais do LinkedIn para este usuário.');

    const { access_token_linkedin, refresh_token_linkedin, expires_at_linkedin } = rows[0];

    // margem de 60s para não expirar no meio da chamada
    const stillValid = expires_at_linkedin && new Date(expires_at_linkedin).getTime() - Date.now() > 60000;
    if (access_token_linkedin && stillValid) return access_token_linkedin;

    if (!refresh_token_linkedin) {
        const err = new Error('REAUTH_REQUIRED');
        err.code = 'REAUTH_REQUIRED';
        throw err;
    }

    // refresh
    const tokenRes = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        querystring.stringify({
            grant_type: 'refresh_token',
            refresh_token: refresh_token_linkedin,
            client_id: LINKEDIN_CLIENT_ID,
            client_secret: LINKEDIN_CLIENT_SECRET
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const newAccess = tokenRes.data.access_token;
    const expiresIn = Number(tokenRes.data.expires_in || 0);
    const newExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

    await pool.query(
        `UPDATE user_keys SET access_token_linkedin = $1, expires_at_linkedin = $2
     WHERE id_user = $3`,
        [newAccess, newExpiresAt, id_user]
    );

    return newAccess;
}

function liHeaders(token) {
    return {
        Authorization: `Bearer ${token}`,
        'LinkedIn-Version': process.env.LINKEDIN_API_VERSION || '202509',
        'X-Restli-Protocol-Version': '2.0.0'
    };
}

module.exports = { getValidLinkedInAccessToken, liHeaders };
