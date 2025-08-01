// Arquivo: helpers/keyHelper.js
const { checkCustomerBelongsToUser } = require('../repositories/customerRepository');
const { getCustomerFacebookKeys } = require('../repositories/customerFacebookRepository');
const { getCustomerInstagramKeys } = require('../repositories/customerInstagramRepository');
const { getCustomerKeys } = require('../repositories/customerRepository');
const { getUserKeys } = require('../repositories/userRepository');
const { getValidAccessToken } = require('./googleAnalyticsHelpers');
const cache = new Map();

const refreshKeysForCustomer = async (id_user, id_customer) => {
  const belongs = await checkCustomerBelongsToUser(id_customer, id_user);
  if (!belongs) throw new Error('Cliente não pertence ao usuário autenticado.');

  try {
    const customerKeys = await getCustomerKeys(id_customer);
    const userKeys = await getUserKeys(id_user);

    const composed = {
      facebook: null,
      instagram: null,
      googleAnalytics: null
    };

    // Facebook
    if (customerKeys && customerKeys.id_facebook_page && customerKeys.access_token_page_facebook) {
      composed.facebook = {
        page_id: customerKeys.id_facebook_page,
        access_token: customerKeys.access_token_page_facebook
      };
    }

    // Instagram
    if (customerKeys && customerKeys.instagram_page_id && userKeys && userKeys.instagram_access_token) {
      composed.instagram = {
        page_id: customerKeys.instagram_page_id,
        access_token: userKeys.instagram_access_token
      };
    }

    // Google Analytics
    if (customerKeys && customerKeys.google_property_id && userKeys && userKeys.access_token_googleanalytics && userKeys.id_user_googleanalytics) {
      composed.googleAnalytics = {
        property_id: customerKeys.google_property_id,
        user_id: userKeys.id_user_googleanalytics,
        access_token: userKeys.access_token_googleanalytics
      };
    }

    const cacheKey = `${id_user}:${id_customer}`;
    cache.set(cacheKey, {
      data: composed,
      expires: Date.now() + 1000 * 60 * 5
    });

    return composed;
  } catch (error) {
    console.error('Erro ao atualizar chaves do cliente:', error);
    throw error;
  }
};

const getGoogleAnalyticsKeys = async (id_user, id_customer) => {
  const cacheKey = `google:${id_user}:${id_customer}`;

  if (cache.has(cacheKey)) {
    const { expires, data } = cache.get(cacheKey);
    if (Date.now() < expires) return data;
    cache.delete(cacheKey);
  }

  const belongs = await checkCustomerBelongsToUser(id_customer, id_user);
  if (!belongs) throw new Error('Cliente não pertence ao usuário autenticado.');

  try {
    const customerKeys = await getCustomerKeys(id_customer);
    const userKeys = await getUserKeys(id_user);

    if (!customerKeys || !userKeys ||
      !customerKeys.id_googleanalytics_property ||
      !userKeys.id_user_googleanalytics) {
      return null;
    }

    const newAccessToken = await getValidAccessToken(id_user);

    if (!newAccessToken) {
      return null;
    }

    const googleKeys = {
      property_id: customerKeys.id_googleanalytics_property,
      access_token: newAccessToken,
      id_user: userKeys.id_user_googleanalytics
    };

    cache.set(cacheKey, {
      data: googleKeys,
      expires: Date.now() + 1000 * 60 * 5
    });

    return googleKeys;
  } catch (error) {
    console.error('Erro ao buscar chaves do Google Analytics:', error);
    return null;
  }
}

// Função opcional para pegar todas as plataformas de uma vez (se necessário)
const getAllKeys = async (id_user, id_customer) => {
  try {
    const [facebook, instagram, google] = await Promise.allSettled([
      getFacebookCustomerKey(id_user, id_customer),
      getInstagramCustomerKey(id_user, id_customer),
      getGoogleAnalyticsKeys(id_user, id_customer)
    ]);

    return {
      facebook: facebook.status === 'fulfilled' ? facebook.value : null,
      instagram: instagram.status === 'fulfilled' ? instagram.value : null,
      google: google.status === 'fulfilled' ? google.value : null
    };
  } catch (error) {
    console.error('Erro ao buscar todas as chaves:', error);
    return {
      facebook: null,
      instagram: null,
      google: null
    };
  }
};
// Limpar cache de um usuário
const clearCacheForUser = (id_user) => {
  for (const key of cache.keys()) {
    if (key.includes(`${id_user}:`)) {
      cache.delete(key);
    }
  }
};

const getFacebookCustomerKey = async (id_user, id_customer) => {
  const cacheKey = `facebook:${id_user}:${id_customer}`;

  if (cache.has(cacheKey)) {
    const { expires, data } = cache.get(cacheKey);
    if (Date.now() < expires) return data;
    cache.delete(cacheKey);
  }

  const belongs = await checkCustomerBelongsToUser(id_customer, id_user);
  if (!belongs) throw new Error('Cliente não pertence ao usuário autenticado.');

  try {
    const customerFacebookKeys = await getCustomerFacebookKeys(id_customer);

    if (!customerFacebookKeys || !customerFacebookKeys.id_facebook_page || !customerFacebookKeys.access_token_page_facebook) {
      return null;
    }

    const facebookKeys = {
      page_id: customerFacebookKeys.id_facebook_page,
      access_token: customerFacebookKeys.access_token_page_facebook
    };

    cache.set(cacheKey, {
      data: facebookKeys,
      expires: Date.now() + 1000 * 60 * 5
    });

    return facebookKeys;
  } catch (error) {
    console.error('Erro ao buscar chaves do Facebook:', error);
    return null;
  }
};

const getInstagramCustomerKey = async (id_user, id_customer) => {
  const cacheKey = `instagram:${id_user}:${id_customer}`;

  if (cache.has(cacheKey)) {
    const { expires, data } = cache.get(cacheKey);
    if (Date.now() < expires) return data;
    cache.delete(cacheKey);
  }

  const belongs = await checkCustomerBelongsToUser(id_customer, id_user);
  if (!belongs) throw new Error('Cliente não pertence ao usuário autenticado.');

  try {
    const customerInstagramKeys = await getCustomerInstagramKeys(id_customer);

    if (!customerInstagramKeys || !customerInstagramKeys.id_instagram_page || !customerInstagramKeys.access_token_page_instagram) {
      return null;
    }

    const instagramKeys = {
      page_id: customerInstagramKeys.id_instagram_page,
      access_token: customerInstagramKeys.access_token_page_instagram
    };

    cache.set(cacheKey, {
      data: instagramKeys,
      expires: Date.now() + 1000 * 60 * 5
    });

    return instagramKeys;
  } catch (error) {
    console.error('Erro ao buscar chaves do Instagram:', error);
    return null;
  }
};


module.exports = {
  getGoogleAnalyticsKeys,
  getAllKeys,
  clearCacheForUser,
  refreshKeysForCustomer,
  getFacebookCustomerKey,
  getInstagramCustomerKey
};
