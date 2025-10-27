// Arquivo: services/linkedinService.js
const axios = require('axios');
const { pool } = require('../config/db');
const { getAllDaysBetween, incrementDecrementDay } = require('../utils/dateUtils');
const { getValidLinkedInAccessToken, liHeaders, makeTimeIntervals, toMsUTC } = require('../helpers/linkedinHelpers');
const BASE = 'https://api.linkedin.com/rest';

// ---------- MÉTRICAS ----------
exports.getImpressions = async (linkedin, startDate, endDate) => {
    const startDateCorrected = incrementDecrementDay(startDate, 'advance', 1)
    const endDateCorrected = incrementDecrementDay(endDate, 'advance', 1)
    const timeIntervals = makeTimeIntervals(startDate, endDate);
    const allDays = getAllDaysBetween(startDate, endDate);
    const perDay = allDays.map(() => 0);
    const url = `https://api.linkedin.com/rest/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=urn%3Ali%3Aorganization%3A${linkedin.organization_id}&timeIntervals=${timeIntervals}`;
    const { data } = await axios.get(url, { headers: liHeaders(linkedin.access_token) });

    const elements = Array.isArray(data.elements) ? data.elements : [];
    elements.forEach(el => {
        const startMs = el?.timeRange?.start;
        if (typeof startMs !== 'number') return;

        let viewsCount = Number(el?.totalShareStatistics?.impressionCount ?? 0);
        const idx = Math.floor((startMs - toMsUTC(startDateCorrected)) / 86400000);
        if (idx >= 0 && idx < perDay.length) perDay[idx] = viewsCount;
    });

    return perDay;
}

exports.getFollowers = async (linkedin, startDate, endDate) => {
    const orgUrn = `urn:li:organization:${linkedin.organization_id}`;
    const url = `${BASE}/networkSizes/${encodeURIComponent(orgUrn)}?edgeType=COMPANY_FOLLOWED_BY_MEMBER`;
    const { data } = await axios.get(url, { headers: liHeaders(linkedin.access_token) });

    const total = Number.parseInt(data?.firstDegreeSize ?? 0, 10);
    return Number.isFinite(total) && total >= 0 ? total : 0;
}

exports.getAllMetricsRows = async (id_customer, linkedin, startDate, endDate) => {
    const [impressionsDaily, followersTotal] = await Promise.all([
        exports.getImpressions(linkedin, startDate, endDate),
        exports.getFollowers(linkedin, startDate, endDate),
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
