// Arquivo: controllers/customerController.js
const { postCustomerFacebook, postCustomerFacebookKeys } = require('../repositories/customerFacebookRepository');

const addFacebookCustomer = async (req, res) => {
  try {
    const { id_customer, id_user, id_page_facebook, name } = req.body;

    await postCustomerFacebook(id_customer, id_user, name);
    await postCustomerFacebookKeys(id_customer, id_user, id_page_facebook);

    res.status(200).json({ success: true, message: 'Cliente Facebook adicionado com sucesso' });
  } catch (error) {
    console.error('Erro ao adicionar cliente Facebook customerFacebookController:', error);
    res.status(500).json({ success: false, message: 'Erro ao adicionar cliente Facebook' });
  }
};

const removeFacebookCustomer = async (req, res) => {
  try {
    const { id } = req.user;
    const { idPage } = req.params;

    await pool.query(
      'DELETE FROM customer_facebook_keys WHERE id_customer = $1 AND id_page_facebook = $2',
      [id, idPage]
    );

    res.status(200).json({ success: true, message: 'Cliente Facebook removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover cliente Facebook:', error);
    res.status(500).json({ success: false, message: 'Erro ao remover cliente Facebook' });
  }
};

module.exports = { addFacebookCustomer, removeFacebookCustomer };
