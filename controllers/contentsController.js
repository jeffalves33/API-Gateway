// Arquivo: controllers/metricsController.js
const { getFacebookCustomerKey, getGoogleAnalyticsKeys, getInstagramCustomerKey, getLinkedinKeys } = require('../helpers/keyHelper');
const { amountContents, engagementRate, totalEngagement, totalComments, totalLikes } = require('../helpers/contentsHelpers');
const facebookService = require('../services/facebookService');
const googleAnalyticsService = require('../services/googleAnalyticsService');
const instagramService = require('../services/instagramService');
const linkedinService = require('../services/linkedinService');

exports.getGeneralMetricsPosts = async (req, res) => {
    try {
        const id_user = req.user.id;
        const { id_customer, startDate, endDate } = req.body;

        const facebook = await getFacebookCustomerKey(id_user, id_customer);
        const instagram = await getInstagramCustomerKey(id_user, id_customer);

        const promises = [];

        // Facebook
        if (facebook && facebook.page_id && facebook.access_token) promises.push(facebookService.getAllMetricsPosts(facebook.page_id, facebook.access_token, startDate, endDate));
        else promises.push(Promise.resolve([]));

        // Instagram
        if (instagram && instagram.page_id && instagram.access_token) promises.push(instagramService.getAllMetricsPosts(instagram.page_id, instagram.access_token, startDate, endDate));
        else promises.push(Promise.resolve([]));

        const [facebookData, instagramData] = await Promise.allSettled(promises);

        const amountContentsValue = amountContents(facebookData, instagramData);
        const totalEngagementValue = totalEngagement(facebookData, instagramData);
        const totalLikesValue = totalLikes(facebookData, instagramData);
        const totalCommentsValue = totalComments(facebookData, instagramData);

        // Extrair valores ou usar array vazio se rejeitado
        const results = {
            amountContents: amountContentsValue,
            totalComments: totalCommentsValue,
            totalEngagement: totalEngagementValue,
            totalLikes: totalLikesValue,
            labels: [],
            facebook: facebookData.status === 'fulfilled' ? facebookData.value : [],
            instagram: instagramData.status === 'fulfilled' ? instagramData.value : []
        };

        // Gerar labels baseado no maior array de dados disponível
        const maxLength = Math.max(results.facebook.length, results.instagram.length);

        if (maxLength > 0) {
            results.labels = Array.from({ length: maxLength }, (_, i) => {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                return date.toISOString().split('T')[0];
            });
        }

        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro ao buscar conteúdos' });
    }
};
