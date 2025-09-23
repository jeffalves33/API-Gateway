// Arquivo: controllers/linkedinController.js
const axios = require('axios');
const querystring = require('querystring');
const { pool } = require('../config/db');
const { getValidLinkedInAccessToken, liHeaders } = require('../helpers/linkedinHelpers');

const LINKEDIN_CLIENT_ID = '77b662p87zgthq';
const LINKEDIN_CLIENT_SECRET = 'WPL_AP1.xnVHxAwFB1tPCa0Y.D3jxLA==';
const LINKEDIN_API_VERSION = '202508';
const LINKEDIN_REDIRECT_URI = 'https://www.hokoainalytics.com.br/api/linkedin/auth/callback';

// 1) Início do OAuth
exports.startOAuth = (req, res) => {
    const scopes = [
        'r_organization_social', 'rw_organization_admin'
    ];

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` + querystring.stringify({
        response_type: 'code',
        client_id: LINKEDIN_CLIENT_ID,
        redirect_uri: LINKEDIN_REDIRECT_URI,
        state: req.user.id,
        scope: scopes.join(' ')
    });

    res.redirect(authUrl);
};

// 2) Callback do OAuth
exports.handleOAuthCallback = async (req, res) => {
    const { code, state, error, error_description } = req.query;
    if (error) {
        console.error('LinkedIn OAuth error:', error, error_description);
        // Redirecione com uma flag para a sua UI tratar (toast/modal)
        return res.redirect(`/platformsPage.html?li_error=${encodeURIComponent(error_description || error)}`);
    }

    try {
        // troca o code pelo access_token + refresh_token
        const tokenRes = await axios.post('https://www.linkedin.com/oauth/v2/accessToken',
            querystring.stringify({
                grant_type: 'authorization_code',
                code,
                redirect_uri: LINKEDIN_REDIRECT_URI,
                client_id: LINKEDIN_CLIENT_ID,
                client_secret: LINKEDIN_CLIENT_SECRET
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const access_token = tokenRes.data.access_token;
        const expires_in = Number(tokenRes.data.expires_in || 0);
        const refresh_token = tokenRes.data.refresh_token || null;
        const rt_expires_in = Number(tokenRes.data.refresh_token_expires_in || 0);

        const expires_at = expires_in ? new Date(Date.now() + expires_in * 1000) : null;
        const refresh_token_expires_at = rt_expires_in ? new Date(Date.now() + rt_expires_in * 1000) : null;

        // pega o id do membro (para reference)
        const meRes = await axios.get('https://api.linkedin.com/rest/me', {
            headers: {
                ...liHeaders(access_token)
            }
        });
        const id_user_linkedin = meRes.data.id;

        await pool.query(
            `INSERT INTO user_keys(
                id_user,
                id_user_linkedin,
                access_token_linkedin,
                refresh_token_linkedin,
                expires_at_linkedin,
                refresh_token_expires_at_linkedin
            ) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id_user) DO UPDATE SET
                id_user_linkedin = EXCLUDED.id_user_linkedin,
                access_token_linkedin = EXCLUDED.access_token_linkedin,
                refresh_token_linkedin = EXCLUDED.refresh_token_linkedin,
                expires_at_linkedin = EXCLUDED.expires_at_linkedin,
                refresh_token_expires_at_linkedin = EXCLUDED.refresh_token_expires_at_linkedin`,
            [id_user, id_user_linkedin, access_token, refresh_token, expires_at, refresh_token_expires_at]
        );

        return res.redirect('/platformsPage.html');
    } catch (err) {
        console.error('Erro OAuth LinkedIn:', err.response?.data || err.message);
        return res.status(500).send('Erro ao autenticar com o LinkedIn');
    }
};

// 3) Status para a platformsPage
exports.checkStatus = async (req, res) => {
    try {
        const id_user = req.user.id;
        const { rows } = await pool.query(
            `SELECT access_token_linkedin, refresh_token_linkedin, expires_at_linkedin FROM user_keys WHERE id_user = $1`,
            [id_user]
        );

        const row = rows[0] || {};
        const linkedinConnected = !!(row.access_token_linkedin && (row.refresh_token_linkedin || row.expires_at_linkedin));
        let linkedinDaysLeft = null, needsReauthLinkedIn = false;

        if (row.expires_at_linkedin) {
            const diff = new Date(row.expires_at_linkedin) - Date.now();
            linkedinDaysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
            needsReauthLinkedIn = linkedinDaysLeft <= 7;
        }

        res.json({ linkedinConnected, linkedinDaysLeft, needsReauthLinkedIn });
    } catch (err) {
        console.error('Erro status LinkedIn:', err);
        res.status(500).json({ linkedinConnected: false });
    }
};

// 4) Listar páginas (organizations) em que o usuário é ADMIN
exports.getOrganizations = async (req, res) => {
    try {
        const id_user = req.user.id;
        const token = await getValidLinkedInAccessToken(id_user);

        // Passo A: buscar ACLs onde o membro é ADMINISTRATOR
        const aclsRes = await axios.get(
            'https://api.linkedin.com/rest/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED&count=1000',
            { headers: liHeaders(token) }
        );

        const orgUrns = (aclsRes.data.elements || [])
            .map(e => e.organizationalTarget)
            .filter(Boolean);

        if (!orgUrns.length) return res.json({ organizations: [] });

        // Passo B: resolver nomes das organizações
        const encodedList = encodeURIComponent(`List(${orgUrns.join(',')})`);
        const orgsRes = await axios.get(
            `https://api.linkedin.com/rest/organizations?ids=${encodedList}&projection=(elements*(id,localizedName,vanityName))`,
            { headers: liHeaders(token) }
        );

        const orgs = (orgsRes.data.elements || []).map(o => ({
            urn: `urn:li:organization:${o.id}`,
            id: o.id,
            name: o.localizedName || o.vanityName || String(o.id),
            vanityName: o.vanityName || null
        }));

        res.json({ organizations: orgs });
    } catch (err) {
        console.error('Erro ao listar organizations do LinkedIn:', err.response?.data || err.message);
        res.status(500).json({ message: 'Erro ao buscar páginas do LinkedIn' });
    }
};
