// Arquivo: services/linkedinService.js
const axios = require('axios');
const { pool } = require('../config/db');
const { getAllDaysBetween } = require('../utils/dateUtils');
const { getValidLinkedInAccessToken, liHeaders } = require('../helpers/linkedinHelpers');

const BASE = 'https://api.linkedin.com/rest';

// pega o id_user a partir do cliente (pra buscar o token no user_keys)
async function getUserIdByCustomer(id_customer) {
    const { rows } = await pool.query(
        'SELECT id_user FROM customer WHERE id_customer = $1',
        [id_customer]
    );
    if (!rows.length) throw new Error('Cliente não encontrado para obter id_user');
    return rows[0].id_user;
}

// helpers para montar intervalos no formato da API do LinkedIn
function toMsUTC(d) {
    const x = new Date(d);
    return Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate());
}

function makeTimeIntervals(startDate, endDate) {
    const startMs = toMsUTC(startDate);
    const endMs = toMsUTC(endDate) + 86400000; // inclui o último dia
    return `(timeRange:(start:${startMs},end:${endMs}),timeGranularityType:DAY)`;
}

// ---------- MÉTRICAS ----------
async function getPageImpressions(orgId, token, startDate, endDate) {
    const timeIntervals = makeTimeIntervals(startDate, endDate);
    const allDays = getAllDaysBetween(startDate, endDate);
    const perDay = allDays.map(() => 0);

    const url = `https://api.linkedin.com/rest/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=urn%3Ali%3Aorganization%3A${orgId}&timeIntervals=${timeIntervals}`;
    const { data } = await axios.get(url, { headers: liHeaders(token) });

    const elements = Array.isArray(data.elements) ? data.elements : [];
    elements.forEach(el => {
        const startMs = el?.timeRange?.start;
        if (typeof startMs !== 'number') return;

        let viewsCount = Number(el?.totalShareStatistics?.impressionCount ?? 0);
        const idx = Math.floor((startMs - toMsUTC(startDate)) / 86400000);
        if (idx >= 0 && idx < perDay.length) perDay[idx] = viewsCount;
    });

    return perDay;
}

async function getFollowers(orgId, token, startDate, endDate) {
    const orgUrn = `urn:li:organization:${orgId}`;

    const url = `${BASE}/networkSizes/${encodeURIComponent(orgUrn)}?edgeType=COMPANY_FOLLOWED_BY_MEMBER`;
    const { data } = await axios.get(url, { headers: liHeaders(token) });

    const total = Number.parseInt(data?.firstDegreeSize ?? 0, 10);
    return Number.isFinite(total) && total >= 0 ? total : 0;
}

// ---------- ORQUESTRADOR ----------
exports.getAllMetricsRows = async (id_customer, orgId, startDate, endDate) => {
    const id_user = await getUserIdByCustomer(id_customer);
    const token = await getValidLinkedInAccessToken(id_user);

    const [impressionsDaily, followersTotal] = await Promise.all([
        getPageImpressions(orgId, token, startDate, endDate),
        getFollowers(orgId, token, startDate, endDate),
    ]);

    // monta linhas por dia (padrão das outras plataformas)
    const days = getAllDaysBetween(startDate, endDate);
    return impressionsDaily.map((impressions, idx) => {
        const label = days[idx];
        const iso = String(label).replace(/(\d{4})-?(\d{2})-?(\d{2})/, '$1-$2-$3');
        return {
            id_customer,
            data: new Date(iso),
            impressions,
            followers: followersTotal,
        };
    });
};
