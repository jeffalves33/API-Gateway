// Arquivo: controllers/customerController.js
const { getCustomersByUserId, createCustomer, deleteCustomerById, removePlatformFromCustomer } = require('../repositories/customerRepository');
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

    await createCustomer(id_user, customer.name, customer.company, customer.email, customer.phone, customer.platforms[0].id_facebook_page, customer.platforms[0].access_token, customer.platforms[1].id_instagram_page, customer.platforms[1].access_token);
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

const removePlatformCustomer = async (req, res) => {
  try {
    const id_user = req.user.id;
    const platform = req.params.platform.toLowerCase();

    const customers = await getCustomersByUserId(id_user);

    if (!customers || customers.length === 0) {
      return res.status(404).json({ success: false, message: 'Nenhum cliente encontrado' });
    }

    for (const customer of customers) {
      await removePlatformFromCustomer(platform, customer, id_user);
    }

    res.status(200).json({ success: true, message: 'Plataforma removida dos clientes com sucesso' });
  } catch (error) {
    console.error('Erro ao remover plataforma do cliente:', error);
    res.status(500).json({ success: false, message: error.message || 'Erro ao remover cliente' });
  }
};

module.exports = { getCustomersByUser, refreshCustomerKeys, addCustomer, removePlatformCustomer };