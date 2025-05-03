// Arquivo: controllers/metricsController.js
const { getFacebookKeys, getInstagramKeys, getGoogleAnalyticsKeys } = require('../helpers/keyHelper');
const facebookService = require('../services/facebookService');
const instagramService = require('../services/instagramService');
const googleAnalyticsService = require('../services/googleAnalyticsService');

exports.getReachMetrics = async (req, res) => {
  try {
    const id_user = req.user.id;
    const { id_customer, startDate, endDate } = req.body;

    const facebook = await getFacebookKeys(id_user, id_customer);
    //const instagram = await getInstagramKeys(id_user, id_customer);

    const [facebookData, instagramData] = await Promise.all([
      facebookService.getReach(facebook.page_id, facebook.access_token, startDate, endDate),
      []//instagramService.getReach(instagram.page_id, instagram.access_token, startDate, endDate)
    ]);

    const labels = facebookData.map((_, i) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      return date.toISOString().split('T')[0];
    });

    res.json({
      labels,
      facebook: facebookData,
      instagram: instagramData
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao buscar dados de alcance' });
  }
};

exports.getImpressionMetrics = async (req, res) => {
  try {
    const id_user = req.user.id;
    const { id_customer, startDate, endDate } = req.body;

    const facebook = await getFacebookKeys(id_user, id_customer);
    const instagram = await getInstagramKeys(id_user, id_customer);
    const google = await getGoogleAnalyticsKeys(id_user, id_customer);

    const [facebookData, instagramData, googleData, linkedinData] = await Promise.all([
      facebookService.getImpressions(facebook.page_id, facebook.access_token, startDate, endDate),
      instagramService.getImpressions(instagram.page_id, instagram.access_token, startDate, endDate),
      googleAnalyticsService.getImpressions(google, startDate, endDate),
      [0, 0, 0, 0, 0, 0]
    ]);

    const labels = facebookData.map((_, i) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      return date.toISOString().split('T')[0];
    });

    res.json({
      labels,
      facebook: facebookData,
      instagram: instagramData,
      google: googleData,
      linkedin: linkedinData
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao buscar dados de impressões' });
  }
};

exports.getfollowersMetrics = async (req, res) => {
  try {
    const id_user = req.user.id;
    const { id_customer, startDate, endDate } = req.body;

    const facebook = await getFacebookKeys(id_user, id_customer);
    const instagram = await getInstagramKeys(id_user, id_customer);

    const [facebookData, instagramData, linkedinData, youtubeData] = await Promise.all([
      facebookService.getFollowers(facebook.page_id, facebook.access_token, startDate, endDate),
      instagramService.getFollowers(instagram.page_id, instagram.access_token, startDate, endDate),
      2301,
      6213
    ]);

    const labels = facebookData.map((_, i) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      return date.toISOString().split('T')[0];
    });

    res.json({
      labels,
      facebook: facebookData,
      instagram: instagramData,
      linkedin: linkedinData,
      youtube: youtubeData
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao buscar dados de seguidores' });
  }
};

exports.getTrafficMetrics = async (req, res) => {
  try {
    const id_user = req.user.id;
    const { id_customer, startDate, endDate } = req.body;

    const google = await getGoogleAnalyticsKeys(id_user, id_customer);

    const googleData = await googleAnalyticsService.getTrafficData(google, startDate, endDate);

    res.json({
      labels: googleData.labels,
      sessions: googleData.sessions,
      sources: googleData.sources
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao buscar dados de tráfego' });
  }
};

exports.getSearchVolumeMetrics = async (req, res) => {
  try {
    const id_user = req.user.id;
    const { id_customer, startDate, endDate } = req.body;

    const google = await getGoogleAnalyticsKeys(id_user, id_customer);

    const googleData = await googleAnalyticsService.getSearchVolumeData(google, startDate, endDate);
    res.json(googleData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao buscar dados de volume de pesquisa' });
  }
};