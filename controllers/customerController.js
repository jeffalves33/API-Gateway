// Arquivo: controllers/customerController.js
const { createCustomer, deleteCustomer, getCustomerByIdCustomer, getCustomersByUserId, removePlatformFromCustomer, updateCustomer } = require('../repositories/customerRepository');
const { refreshKeysForCustomer } = require('../helpers/keyHelper');
const metricsOrchestrator = require('../usecases/processCustomerMetricsUseCase');
const { getGoogleAnalyticsKeys } = require('../helpers/keyHelper');

const addCustomer = async (req, res) => {
  try {
    const id_user = req.user.id;
    const { name, company, email, phone, platforms } = req.body;

    const id_customer = await createCustomer(
      id_user, name, company, email, phone,
      platforms.find(p => p.id_facebook_page)?.id_facebook_page || null,
      platforms.find(p => p.id_facebook_page)?.access_token || null,
      platforms.find(p => p.id_instagram_page)?.id_instagram_page || null,
      platforms.find(p => p.id_instagram_page)?.access_token || null,
      platforms.find(p => p.id_googleanalytics_property)?.id_googleanalytics_property || null
    );

    const google = await getGoogleAnalyticsKeys(id_user, id_customer);

    await metricsOrchestrator.processCustomerMetrics(id_user, id_customer, platforms, google);

    return res.status(200).json({ success: true, message: 'Cliente e métricas adicionados com sucesso.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
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

const getCustomerById = async (req, res) => {
  try {
    const id_customer = req.params.id_customer;
    const customer = await getCustomerByIdCustomer(id_customer);
    res.status(200).json({ success: true, customer });
  } catch (error) {
    console.error('Erro ao buscar ciente:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar cliente' });
  }
};

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

const updateCustomerById = async (req, res) => {
  try {
    const id_user = req.user.id;
    const id_customer = req.params.id_customer;
    const { name, email } = req.body;

    // Validar se os campos obrigatórios foram enviados
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Nome e email são obrigatórios'
      });
    }

    // Você precisará criar esta função no repository
    await updateCustomer(id_customer, name, email);

    res.status(200).json({
      success: true,
      message: 'Cliente atualizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao atualizar cliente'
    });
  }
};

module.exports = { addCustomer, deleteCustomerById, getCustomerById, getCustomersByUser, refreshCustomerKeys, removePlatformCustomer, updateCustomerById };