// Arquivo: repositories/customerFacebookRepository.js
const { pool } = require('../config/db');

const postCustomerFacebook = async (id_customer, id_user, name) => {
  try {
    await pool.query(
      'INSERT INTO customer_facebook (id_customer, id_user, name) VALUES ($1, $2, $3)',
      [id_customer, id_user, name]
    );
  } catch (error) {
    console.error('Erro ao adicionar cliente Facebook customerFacebookRepository:', error);
    throw error;
  }
};

const postCustomerFacebookKeys = async (id_customer, id_page_facebook) => {
  try {
    await pool.query(
      'INSERT INTO customer_facebook_keys (id_customer, id_page_facebook) VALUES ($1, $2)',
      [id_customer, id_page_facebook]
    );
  } catch (error) {
    console.error('Erro ao adicionar chaves do cliente Facebook:', error);
    throw error;
  }
};

module.exports = { postCustomerFacebook, postCustomerFacebookKeys };
