// Arquivo: services/googleAnalyticsService.js
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const { GoogleAuth } = require('google-auth-library');
const { getCustomerKeys } = require('../repositories/customerRepository');
const { splitDateRange, formatDate } = require('../utils/dateUtils');

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
