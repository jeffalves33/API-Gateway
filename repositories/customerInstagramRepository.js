// Arquivo: repositories/customerFacebookRepository.js
const { pool } = require('../config/db');
const axios = require('axios');

const getCustomerInstagramKeys = async (id_customer) => {
  const result = await pool.query('SELECT * FROM customer WHERE id_customer = $1', [id_customer]);
  if (result.rows.length === 0) throw new Error('Nenhuma chave encontrada para este cliente');
  return result.rows[0];
};


module.exports = { getCustomerInstagramKeys };
