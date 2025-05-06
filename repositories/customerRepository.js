// Arquivo: repositories/customerRepository.js
const { pool } = require('../config/db');

const getCustomersByUserId = async (id_user) => {
  const result = await pool.query(
    'SELECT * FROM customer WHERE id_user = $1',
    [id_user]
  );
  return result.rows;
};

const createCustomer = async (id_user, name, company, email, phone, id_facebook_page, access_token_page_facebook) => {
  const result = await pool.query(
    'INSERT INTO customer(id_user, name, company, email, phone, id_facebook_page, access_token_page_facebook) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [id_user, name, company, email, phone, id_facebook_page, access_token_page_facebook]
  );
  return result.rows;
};

const checkCustomerBelongsToUser = async (id_customer, id_user) => {
  const result = await pool.query(
    'SELECT * FROM customer WHERE id_customer = $1 AND id_user = $2',
    [id_customer, id_user]
  );
  return result.rows.length > 0;
};

module.exports = { getCustomersByUserId, checkCustomerBelongsToUser, createCustomer };