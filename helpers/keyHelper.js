// Arquivo: helpers/keyHelper.js
const { checkCustomerBelongsToUser } = require('../repositories/customerRepository');
const { getCustomerFacebookKeys } = require('../repositories/customerFacebookRepository');
const { getUserKeys } = require('../repositories/userRepository');

const cache = new Map();

const refreshKeysForCustomer = async (id_user, id_customer) => {
  const belongs = await checkCustomerBelongsToUser(id_customer, id_user);
  if (!belongs) throw new Error('Cliente não pertence ao usuário autenticado.');

  const customerKeys = await getCustomerFacebookKeys(id_customer);
  const userKeys = await getUserKeys(id_user);

  const composed = {
    facebook: {
      page_id: customerKeys.facebook_page_id,
      access_token: userKeys.facebook_access_token
    },
    instagram: {
      page_id: customerKeys.instagram_page_id,
      access_token: userKeys.instagram_access_token
    },
    googleAnalytics: {
      property_id: customerKeys.google_property_id,
      credentials: {
        type: customerKeys.google_credentials_type,
        project_id: customerKeys.google_credentials_project_id,
        private_key_id: customerKeys.google_credentials_private_key_id,
        private_key: customerKeys.google_credentials_private_key,
        client_email: customerKeys.google_credentials_client_email,
        client_id: customerKeys.google_credentials_client_id,
        auth_uri: customerKeys.google_credentials_auth_uri,
        token_uri: customerKeys.google_credentials_token_uri,
        auth_provider_x509_cert_url: customerKeys.google_credentials_auth_provider_x509_cert_url,
        client_x509_cert_url: customerKeys.google_credentials_client_x509_cert_url
      }
    }
  };

  const cacheKey = `${id_user}:${id_customer}`;
  cache.set(cacheKey, {
    data: composed,
    expires: Date.now() + 1000 * 60 * 5
  });

  return composed;
};

const getFacebookKeys = async (id_user, id_customer) => {
  const cacheKey = `facebook:${id_user}:${id_customer}`;

  if (cache.has(cacheKey)) {
    const { expires, data } = cache.get(cacheKey);
    if (Date.now() < expires) return data;
    cache.delete(cacheKey);
  }

  const belongs = await checkCustomerBelongsToUser(id_customer, id_user);
  if (!belongs) throw new Error('Cliente não pertence ao usuário autenticado.');

  const customerFacebookKeys = await getCustomerFacebookKeys(id_customer);
  const userKeys = await getUserKeys(id_user);

  const facebookKeys = {
    page_id: customerFacebookKeys.id_page_facebook,
    access_token: userKeys.access_token_meta
  };

  cache.set(cacheKey, {
    data: facebookKeys,
    expires: Date.now() + 1000 * 60 * 5
  });

  return facebookKeys;
};

const getInstagramKeys = async (id_user, id_customer) => {
  const cacheKey = `instagram:${id_user}:${id_customer}`;

  if (cache.has(cacheKey)) {
    const { expires, data } = cache.get(cacheKey);
    if (Date.now() < expires) return data;
    cache.delete(cacheKey);
  }

  const belongs = await checkCustomerBelongsToUser(id_customer, id_user);
  if (!belongs) throw new Error('Cliente não pertence ao usuário autenticado.');

  const customerKeys = await getCustomerInstagramKeys(id_customer);
  const userKeys = await getUserKeys(id_user);

  const instagramKeys = {
    page_id: customerKeys.instagram_page_id,
    access_token: userKeys.instagram_access_token
  };

  cache.set(cacheKey, {
    data: instagramKeys,
    expires: Date.now() + 1000 * 60 * 5
  });

  return instagramKeys;
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

  const customerKeys = await getCustomerKeys(id_customer);

  const googleKeys = {
    property_id: customerKeys.google_property_id,
    credentials: {
      type: customerKeys.google_credentials_type,
      project_id: customerKeys.google_credentials_project_id,
      private_key_id: customerKeys.google_credentials_private_key_id,
      private_key: customerKeys.google_credentials_private_key?.replace(/\\n/g, '\n'), // Corrige formatação
      client_email: customerKeys.google_credentials_client_email,
      client_id: customerKeys.google_credentials_client_id,
      auth_uri: customerKeys.google_credentials_auth_uri,
      token_uri: customerKeys.google_credentials_token_uri,
      auth_provider_x509_cert_url: customerKeys.google_credentials_auth_provider_x509_cert_url,
      client_x509_cert_url: customerKeys.google_credentials_client_x509_cert_url
    }
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
    page_id: customerFacebookKeys.id_page_facebook,
    access_token: customerFacebookKeys.access_token_page
  };

  cache.set(cacheKey, {
    data: facebookKeys,
    expires: Date.now() + 1000 * 60 * 5
  });

  return facebookKeys;
};


module.exports = {
  getFacebookKeys,
  getInstagramKeys,
  getGoogleAnalyticsKeys,
  getAllKeys,
  clearCacheForUser,
  refreshKeysForCustomer,
  getFacebookCustomerKey
};
