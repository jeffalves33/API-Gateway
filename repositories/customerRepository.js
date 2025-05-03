// Arquivo: repositories/customerRepository.js
const { pool } = require('../config/db');

const getCustomersByUserId = async (id_user) => {
  const result = await pool.query(
    'SELECT cf.id_customer, cf.name, cf.email, cfk.id_page_facebook FROM customer_facebook cf LEFT JOIN customer_facebook_keys cfk ON cf.id_customer = cfk.id_customer WHERE cf.id_user = $1',
    [id_user]
  );
  return result.rows;
};

const checkCustomerBelongsToUser = async (id_customer, id_user) => {
  const result = await pool.query(
    'SELECT 1 FROM customer_facebook WHERE id_customer = $1 AND id_user = $2',
    [id_customer, id_user]
  );
  return result.rows.length > 0;
};

module.exports = { getCustomersByUserId, checkCustomerBelongsToUser };