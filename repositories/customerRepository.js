// Arquivo: repositories/customerRepository.js
const { pool } = require('../config/db');
const {
  clearFacebookDataCustomer, clearFacebookDataUser,
  clearGoogleAnalyticsDataCustomer, clearGoogleAnalyticsDataUser,
  clearInstagramDataCustomer, clearInstagramDataUser,
  clearLinkedinDataCustomer, clearLinkedinDataUser
} = require('../helpers/customerHelpers');

const checkCustomerBelongsToUser = async (id_customer, id_user) => {
  const result = await pool.query(
    'SELECT * FROM customer WHERE id_customer = $1 AND id_user = $2',
    [id_customer, id_user]
  );
  return result.rows.length > 0;
};

const createCustomer = async (id_user, name, company, email, phone) => {
  const result = await pool.query(
    'INSERT INTO customer (id_user, name, company, email, phone) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [id_user, name, company, email, phone]
  );
  return result.rows[0];
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
    'DELETE FROM linkedin WHERE id_customer = $1',
    [id_customer]
  );
  /*
  não preciso mais da exclusão do analytics pois a tabela já é exclusiva (devo modificar todas as outras para isso também)
  await pool.query(
    'DELETE FROM google_analytics WHERE id_customer = $1',
    [id_customer]
  );*/
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

const getCustomersListByUserId = async (id_user) => {
  const result = await pool.query(
    `
    SELECT
      c.id_customer,
      c.name,
      c.email,
      c.phone,
      c.created_at,
      COALESCE(
        json_agg(
          json_build_object(
            'platform', ci.platform,
            'status', ci.status,
            'expires_at', ci.expires_at
          )
          ORDER BY ci.platform
        ) FILTER (WHERE ci.id IS NOT NULL),
        '[]'::json
      ) AS integrations
    FROM customer c
    LEFT JOIN customer_integrations ci
      ON ci.id_customer = c.id_customer
    WHERE c.id_user = $1
    GROUP BY c.id_customer
    ORDER BY c.created_at DESC
    `,
    [id_user]
  );

  return result.rows;
};

const removePlatformFromCustomer = async (platform, customer, id_user) => {
  try {
    const { id_customer } = customer;

    if (platform === 'facebook') await clearFacebookDataCustomer(id_customer, id_user);
    if (platform === 'google') await clearGoogleAnalyticsDataCustomer(id_customer, id_user);
    if (platform === 'instagram') await clearInstagramDataCustomer(id_customer, id_user);
    if (platform === 'linkedin') await clearLinkedinDataCustomer(id_customer, id_user);

  } catch (error) {
    console.error(`Erro ao limpar dados do cliente ${customer.id_customer}:`, error);
    throw error;
  }
};

const removePlatformFromUser = async (platform, id_user) => {
  try {
    if (platform === 'facebook') return clearFacebookDataUser(id_user);
    if (platform === 'google') return clearGoogleAnalyticsDataUser(id_user);
    if (platform === 'instagram') return clearInstagramDataUser(id_user);
    if (platform === 'linkedin') return clearLinkedinDataUser(id_user);

    return;
  } catch (error) {
    console.error(`Erro ao limpar dados de usuário para plataforma ${platform}:`, error);
    throw error;
  }
};

const updateCustomer = async (id_customer, id_user, name, email, company, phone) => {
  const result = await pool.query(
    'UPDATE customer SET name = $1, email = $2, company = $3, phone = $4 WHERE id_customer = $5 AND id_user = $6 RETURNING *',
    [name, email, company, phone, id_customer, id_user]
  );

  if (result.rows.length === 0) throw new Error('Cliente não encontrado');
  return result.rows[0];
};


module.exports = { checkCustomerBelongsToUser, createCustomer, deleteCustomer, getCustomerByIdCustomer, getCustomerKeys, getCustomersByUserId, getCustomersListByUserId, removePlatformFromCustomer, removePlatformFromUser, updateCustomer };