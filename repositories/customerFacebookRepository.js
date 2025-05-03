// Arquivo: repositories/customerFacebookRepository.js
const { pool } = require('../config/db');

const getCustomerFacebookKeys = async (id_customer) => {
  const result = await pool.query('SELECT * FROM customer_facebook_keys WHERE id_customer = $1', [id_customer]);
  if (result.rows.length === 0) throw new Error('Nenhuma chave encontrada para este cliente');
  return result.rows[0];
};

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
    const result = await pool.query('SELECT access_token_meta FROM user_keys WHERE id_user = $1', [id_user]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Token do usuário não encontrado' });
    }
    const access_token = result.rows[0].access_token_meta;

    const fbRes = await axios.get('https://graph.facebook.com/v22.0/me/accounts', {
      params: { access_token }
    });
    const fbPages = fbRes.data.data;
    const pageData = fbPages.find(page => page.id === id_page_facebook);
    const access_token_page = pageData.access_token;

    await pool.query(
      'INSERT INTO customer_facebook_keys (id_customer, id_page_facebook, access_token_page) VALUES ($1, $2, $3)',
      [id_customer, id_page_facebook, access_token_page]
    );
  } catch (error) {
    console.error('Erro ao adicionar chaves do cliente Facebook:', error);
    throw error;
  }
};

module.exports = { postCustomerFacebook, postCustomerFacebookKeys, getCustomerFacebookKeys };
