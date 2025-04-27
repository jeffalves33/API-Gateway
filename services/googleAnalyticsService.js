// Arquivo: services/googleAnalyticsService.js
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const { GoogleAuth } = require('google-auth-library');
const { formatDate } = require('../utils/dateUtils');

exports.getImpressions = async (keys, startDate, endDate) => {
  const credentials = keys.credentials;
  const propertyId = keys.property_id;

  const auth = new GoogleAuth({ credentials, scopes: 'https://www.googleapis.com/auth/analytics.readonly' });
  const client = new BetaAnalyticsDataClient({ auth });

  const allDates = getAllDaysBetween(startDate, endDate);
  const dateRange = {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  };

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [dateRange],
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'sessions' }]
  });

  const result = {};
  response.rows.forEach(row => {
    result[row.dimensionValues[0].value] = Number(row.metricValues[0].value);
  });

  return allDates.map(date => result[date] || 0);
};

exports.getTrafficData = async (keys, startDate, endDate) => {
  const credentials = keys.credentials;
  const propertyId = keys.property_id;

  const auth = new GoogleAuth({ credentials, scopes: 'https://www.googleapis.com/auth/analytics.readonly' });
  const client = new BetaAnalyticsDataClient({ auth });

  const allDates = getAllDaysBetween(startDate, endDate);
  const dateRange = {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  };

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [dateRange],
    dimensions: [
      { name: 'sessionDefaultChannelGroup' }, // Canal de origem (Direct, Organic Search, etc.)
      { name: 'date' }
    ],
    metrics: [{ name: 'sessions' }]
  });

  const sessionsPerDay = {};
  const sessionsPerSource = {};

  response.rows.forEach(row => {
    const channelGroup = row.dimensionValues[0].value; // Ex: Organic Search, Direct
    const date = row.dimensionValues[1].value;
    const sessions = Number(row.metricValues[0].value);

    // Preencher sessões por dia (somando todas as fontes)
    sessionsPerDay[date] = (sessionsPerDay[date] || 0) + sessions;

    // Preencher sessões por fonte (acumulado no período)
    sessionsPerSource[channelGroup] = (sessionsPerSource[channelGroup] || 0) + sessions;
  });

  const sessionsArray = allDates.map(date => sessionsPerDay[date] || 0);

  return {
    labels: allDates,
    sessions: sessionsArray,
    sources: sessionsPerSource
  };
};

function getAllDaysBetween(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const dates = [];

  while (startDate <= endDate) {
    dates.push(startDate.toISOString().split('T')[0].replace(/-/g, ''));
    startDate.setDate(startDate.getDate() + 1);
  }

  return dates;
}
