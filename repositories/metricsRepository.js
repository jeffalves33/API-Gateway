// Arquivo: repositories/metricsRepository.js
const { pool } = require('../config/db');

const insertFacebookMetrics = async (rows) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (const row of rows) {
            await client.query(
                `INSERT INTO facebook (id_customer, data, page_impressions, page_impressions_unique, page_follows) VALUES ($1, $2, $3, $4, $5)`,
                [
                    row.id_customer,
                    row.data,
                    row.page_impressions,
                    row.page_impressions_unique,
                    row.page_follows
                ]
            );
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const insertInstagramMetrics = async (rows) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (const row of rows) {
            await client.query(
                `INSERT INTO instagram (id_customer, data, reach, views, followers) VALUES ($1, $2, $3, $4, $5)`,
                [
                    row.id_customer,
                    row.data,
                    row.reach,
                    row.views,
                    row.followers
                ]
            );
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const insertGoogleAnalyticsMetrics = async (rows) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (const row of rows) {
            await client.query(
                'INSERT INTO google_analytics (id_customer, data, impressions, traffic_direct, traffic_organic_search, traffic_organic_social, search_volume) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [
                    row.id_customer,
                    row.data,
                    row.impressions,
                    row.traffic_direct,
                    row.traffic_organic_search,
                    row.traffic_organic_social,
                    row.search_volume
                ]
            );
        }

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

const insertLinkedinMetrics = async (rows) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (const row of rows) {
            await client.query(
                `INSERT INTO linkedin (id_customer, data, impressions, followers) VALUES ($1, $2, $3, $4)`,
                [
                    row.id_customer,
                    row.data,
                    row.impressions,
                    row.followers
                ]
            );
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

module.exports = { insertFacebookMetrics, insertGoogleAnalyticsMetrics, insertInstagramMetrics, insertLinkedinMetrics };
