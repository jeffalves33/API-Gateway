const { pool } = require('../config/db');

const clearFacebookDataCustomer = async (id_customer, id_user) => {
    await pool.query(
        'DELETE FROM facebook WHERE id_customer = $1',
        [id_customer]
    );
    await pool.query(
        'UPDATE customer SET id_facebook_page = $1, access_token_page_facebook = $2 WHERE id_customer = $3',
        [null, null, id_customer]
    );
    await pool.query(
        'UPDATE user_keys SET id_user_facebook = $1, access_token_facebook = $2 WHERE id_user = $3',
        [null, null, id_user]
    );
};

const clearInstagramDataCustomer = async (id_customer, id_user) => {
    await pool.query(
        'DELETE FROM instagram WHERE id_customer = $1',
        [id_customer]
    );
    await pool.query(
        'UPDATE customer SET id_instagram_page = $1, access_token_page_instagram = $2 WHERE id_customer = $3',
        [null, null, id_customer]
    );
    await pool.query(
        'UPDATE user_keys SET id_user_instagram = $1, access_token_instagram = $2 WHERE id_user = $3',
        [null, null, id_user]
    );
};

const clearGoogleAnalyticsDataCustomer = async (id_customer, id_user) => {
    await pool.query(
        'DELETE FROM google_analytics WHERE id_customer = $1',
        [id_customer]
    );
    /*await pool.query(
        'UPDATE customer SET id_facebook_page = $1, access_token_page_facebook = $2 WHERE id_customer = $3',
        [null, null, id_customer]
    );*/
    await pool.query(
        'UPDATE user_keys SET id_user_googleanalytics = $1, access_token_googleanalytics = $2, refresh_token_googleanalytics = $3 WHERE id_user = $4',
        [null, null, null, id_user]
    );
};

module.exports = { clearFacebookDataCustomer, clearInstagramDataCustomer, clearGoogleAnalyticsDataCustomer };
