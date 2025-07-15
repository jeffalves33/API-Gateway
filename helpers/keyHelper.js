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

  const customerKeys = await getCustomerKeys(id_customer);
  const userKeys = await getUserKeys(id_user);

  const composed = {
    facebook: {
      page_id: customerKeys.id_facebook_page,
      access_token: customerKeys.access_token_page_facebook
    },
    instagram: {
      page_id: customerKeys.instagram_page_id,
      access_token: userKeys.instagram_access_token
    },
    googleAnalytics: {
      property_id: customerKeys.google_property_id,
      user_id: userKeys.id_user_googleanalytics,
      access_token: userKeys.access_token_googleanalytics,

    }
  };

  const cacheKey = `${id_user}:${id_customer}`;
  cache.set(cacheKey, {
    data: composed,
    expires: Date.now() + 1000 * 60 * 5
  });

  return composed;
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

  const newAccessToken = await getValidAccessToken(id_user);
  const customerKeys = await getCustomerKeys(id_customer);
  const userKeys = await getUserKeys(id_user);

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
};

// Função opcional para pegar todas as plataformas de uma vez (se necessário)
const getAllKeys = async (id_user, id_customer) => {
  const [facebook, instagram, google] = await Promise.all([
    getFacebookKeys(id_user, id_customer),
    getInstagramKeys(id_user, id_customer),
    getGoogleAnalyticsKeys(id_user, id_customer)
  ]);

  return { facebook, instagram, google };
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

  const customerFacebookKeys = await getCustomerFacebookKeys(id_customer);

  const facebookKeys = {
    page_id: customerFacebookKeys.id_facebook_page,
    access_token: customerFacebookKeys.access_token_page_facebook
  };

  cache.set(cacheKey, {
    data: facebookKeys,
    expires: Date.now() + 1000 * 60 * 5
  });

  return facebookKeys;
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

  const customerInstagramKeys = await getCustomerInstagramKeys(id_customer);

  const instagramKeys = {
    page_id: customerInstagramKeys.id_instagram_page,
    access_token: customerInstagramKeys.access_token_page_instagram
  };

  cache.set(cacheKey, {
    data: instagramKeys,
    expires: Date.now() + 1000 * 60 * 5
  });

  return instagramKeys;
};


module.exports = {
  getGoogleAnalyticsKeys,
  getAllKeys,
  clearCacheForUser,
  refreshKeysForCustomer,
  getFacebookCustomerKey,
  getInstagramCustomerKey
};
