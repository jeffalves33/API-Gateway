// Arquivo: services/instagramService.js
const axios = require('axios');
const { splitDateRange, formatDate } = require('../utils/dateUtils');

const BASE_URL = 'https://graph.facebook.com/v22.0';

exports.getReach = async (pageId, accessToken, startDate, endDate, period = 'day') => {
  const allValues = [];

  for (const [since, until] of splitDateRange(startDate, endDate, 30)) {
    const response = await axios.get(`${BASE_URL}/${pageId}/insights`, {
      params: {
        metric: 'reach',
        access_token: accessToken,
        period,
        since: formatDate(since),
        until: formatDate(until)
      }
    });

    if (response.status === 200) {
      const values = response.data.data[0]?.values.map(v => v.value) || [];
      allValues.push(...values);
    } else {
      throw new Error(`Erro Instagram API: ${response.status} - ${response.statusText}`);
    }
  }

  return allValues;
};

exports.getImpressions = async (pageId, accessToken, startDate, endDate) => {
  const allValues = [];

  let current = new Date(startDate);
  const finalDate = new Date(endDate);

  while (current <= finalDate) {
    const nextDate = new Date(current);
    nextDate.setDate(nextDate.getDate() + 1);

    const formattedSince = formatDate(current);
    const formattedUntil = formatDate(nextDate);

    try {
      const response = await axios.get(`${BASE_URL}/${pageId}/insights`, {
        params: {
          metric: 'views',
          metric_type: 'total_value',
          access_token: accessToken,
          period: 'day',
          since: formattedSince,
          until: formattedUntil
        }
      });

      let dailyValue = 0;

      if (response.data?.data?.length > 0 && response.data.data[0].total_value?.value !== undefined) {
        dailyValue = response.data.data[0].total_value.value;
      }

      allValues.push(dailyValue);

    } catch (error) {
      allValues.push(0);
    }

    current.setDate(current.getDate() + 1);
  }
  return allValues;
};

exports.getFollowers = async (pageId, accessToken, startDate, endDate, period = 'day') => {
  const response = await axios.get(`${BASE_URL}/${pageId}`, {
    params: {
      fields: 'followers_count',
      access_token: accessToken
    }
  });

  if (response.status === 200) {
    return response.data.followers_count;
  } else {
    throw new Error(`Erro Instagram API: ${response.status} - ${response.statusText}`);
  }
};

exports.getAllMetricsRows = async (id_customer, pageId, accessToken, startDate, endDate) => {
  const [reach, views, followers] = await Promise.all([
    exports.getReach(pageId, accessToken, startDate, endDate),
    exports.getImpressions(pageId, accessToken, startDate, endDate),
    exports.getFollowers(pageId, accessToken)
  ]);

  return reach.map((value, idx) => ({
    id_customer,
    data: new Date(startDate.getTime() + idx * 86400000),
    reach: value,
    views: views[idx] || 0,
    followers
  }));
};