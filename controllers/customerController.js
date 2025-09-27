// Arquivo: controllers/customerController.js
const { createCustomer, deleteCustomer, getCustomerByIdCustomer, getCustomersByUserId, removePlatformFromCustomer, removePlatformFromUser, updateCustomer } = require('../repositories/customerRepository');
const { refreshKeysForCustomer, getGoogleAnalyticsKeys, getLinkedinKeys } = require('../helpers/keyHelper');
const metricsOrchestrator = require('../usecases/processCustomerMetricsUseCase');

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
      platforms.find(p => p.id_googleanalytics_property)?.id_googleanalytics_property || null,
      platforms.find(p => p.id_linkedin_organization)?.id_linkedin_organization || null,
    );

    const google = await getGoogleAnalyticsKeys(id_user, id_customer);
    const linkedin = await getLinkedinKeys(id_user, id_customer);

    // refatorar para todas plaraformas serem enviadas da mesma forma que o google e linkedin
    await metricsOrchestrator.processCustomerMetrics(id_user, id_customer, platforms, google, linkedin);

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
    const hasCustomers = Array.isArray(customers) && customers.length > 0;

    if (hasCustomers) {
      for (const customer of customers) {
        await removePlatformFromCustomer(platform, customer, id_user);
      }
    }

    await removePlatformFromUser(platform, id_user);

    const msg = hasCustomers
      ? 'Plataforma removida dos clientes e desconectada do usuário com sucesso'
      : 'Plataforma desconectada do usuário com sucesso';

    return res.status(200).json({ success: true, message: msg });
  } catch (error) {
    console.error('Erro ao remover plataforma do cliente/usuário:', error);
    return res.status(500).json({ success: false, message: error.message || 'Erro ao remover plataforma' });
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