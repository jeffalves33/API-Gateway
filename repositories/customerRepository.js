// Arquivo: repositories/customerRepository.js
const { pool } = require('../config/db');
const { clearFacebookDataCustomer, clearInstagramDataCustomer, clearGoogleAnalyticsDataCustomer } = require('../helpers/customerHelpers');

const checkCustomerBelongsToUser = async (id_customer, id_user) => {
  const result = await pool.query(
    'SELECT * FROM customer WHERE id_customer = $1 AND id_user = $2',
    [id_customer, id_user]
  );
  return result.rows.length > 0;
};

const createCustomer = async (id_user, name, company, email, phone, id_facebook_page, access_token_page_facebook, id_instagram_page, access_token_page_instagram, id_googleanalytics_property) => {
  const result = await pool.query(
    'INSERT INTO customer(id_user, name, company, email, phone, id_facebook_page, access_token_page_facebook, id_instagram_page, access_token_page_instagram, id_googleanalytics_property) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id_customer',
    [id_user, name, company, email, phone, id_facebook_page, access_token_page_facebook, id_instagram_page, access_token_page_instagram, id_googleanalytics_property]
  );
  return result.rows[0]['id_customer'];
};

const deleteCustomer = async (id_customer) => {
  await pool.query(
    'DELETE FROM facebook WHERE id_customer = $1',
    [id_customer]
  );
  await pool.query(
    'DELETE FROM instagram WHERE id_customer = $1',
    [id_customer]
  );
  await pool.query(
    'DELETE FROM customer WHERE id_customer = $1',
    [id_customer]
  );
}

const getCustomerByIdCustomer = async (id_customer) => {
  const result = await pool.query('SELECT * FROM customer WHERE id_customer = $1', [id_customer]);
  return result.rows;
};

const getCustomerKeys = async (id_customer) => {
  const result = await pool.query('SELECT * FROM customer WHERE id_customer = $1', [id_customer]);
  if (result.rows.length === 0) throw new Error('Nenhuma chave encontrada para este cliente');
  return result.rows[0];
};

const getCustomersByUserId = async (id_user) => {
  const result = await pool.query(
    'SELECT * FROM customer WHERE id_user = $1',
    [id_user]
  );
  return result.rows;
};

const removePlatformFromCustomer = async (platform, customer, id_user) => {
  try {
    const { id_customer } = customer;

    if (platform === 'facebook') await clearFacebookDataCustomer(id_customer, id_user);
    if (platform === 'instagram') await clearInstagramDataCustomer(id_customer, id_user);
    if (platform === 'google') await clearGoogleAnalyticsDataCustomer(id_customer, id_user);

  } catch (error) {
    console.error(`Erro ao limpar dados do cliente ${customer.id_customer}:`, error);
    throw error;
  }
};

const updateCustomer = async (id_customer, name, email) => {
  const result = await pool.query(
    'UPDATE customer SET name = $1, email = $2 WHERE id_customer = $3 RETURNING *',
    [name, email, id_customer]
  );

  if (result.rows.length === 0) {
    throw new Error('Cliente não encontrado');
  }

  return result.rows[0];
};

module.exports = { checkCustomerBelongsToUser, createCustomer, deleteCustomer, getCustomerByIdCustomer, getCustomerKeys, getCustomersByUserId, removePlatformFromCustomer, updateCustomer };