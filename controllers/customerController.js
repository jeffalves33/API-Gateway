// Arquivo: controllers/customerController.js
const { getCustomersByUserId, createCustomer, removePlatformFromCustomer, deleteCustomer } = require('../repositories/customerRepository');
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

    let facebookPageId = null;
    let facebookToken = null;
    let instagramPageId = null;
    let instagramToken = null;

    if (Array.isArray(customer.platforms)) {
      for (const platform of customer.platforms) {
        if (platform.id_facebook_page) {
          facebookPageId = platform.id_facebook_page;
          facebookToken = platform.access_token;
        } else if (platform.id_instagram_page) {
          instagramPageId = platform.id_instagram_page;
          instagramToken = platform.access_token;
        }
      }
    }

    await createCustomer(
      id_user,
      customer.name,
      customer.company,
      customer.email,
      customer.phone,
      facebookPageId,
      facebookToken,
      instagramPageId,
      instagramToken
    );

    res.status(200).json({ success: true, message: 'Cliente adicionado com sucesso.' });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteCustomerById = async (req, res) => {
  try {
    const id_user = req.user.id;
    const id_customer = req.params.id_customer;

    await deleteCustomer(id_customer);

    res.status(200).json({ success: true, message: 'Cliente excluido com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir cliente:', error);
    res.status(500).json({ success: false, message: error.message || 'Erro ao excluir cliente' });
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

module.exports = { getCustomersByUser, refreshCustomerKeys, addCustomer, removePlatformCustomer, deleteCustomerById };