// Arquivo: controllers/customerController.js
const { getCustomersByUserId, createCustomer } = require('../repositories/customerRepository');
const { refreshKeysForCustomer } = require('../helpers/keyHelper');

const getCustomersByUser = async (req, res) => {
  try {
    const idUser = req.user.id;
    const customers = await getCustomersByUserId(idUser);
    res.status(200).json({ success: true, customers });
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar clientes' });
  }
};

const addCustomer = async (req, res) => {
  try {
    const id_user = req.user.id;
    const customer = req.body;

    await createCustomer(id_user, customer.name, customer.company, customer.email, customer.phone, customer.platforms[0].id_facebook_page, customer.platforms[0].access_token)

    res.status(200).json({ success: true, message: 'Cliente adicionado com sucesso.' });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message });
  }
};

const refreshCustomerKeys = async (req, res) => {
  try {
    const id_user = req.user.id;
    const { id_customer } = req.body;
    await refreshKeysForCustomer(id_user, id_customer); 
    res.status(200).json({ success: true, message: 'Chaves atualizadas em cache' });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = { getCustomersByUser, refreshCustomerKeys, addCustomer };