// Arquivo: usecases/processCustomerMetricsUseCase.js
const facebookService = require('../services/facebookService');
const googleService = require('../services/googleAnalyticsService');
const instagramService = require('../services/instagramService');
const linkedinService = require('../services/linkedinService');
const metricsRepo = require('../repositories/metricsRepository');
const { buildDates } = require('../utils/dateUtils');

async function processCustomerMetrics(id_user, id_customer, platforms, google) {
    const { since, endDate } = buildDates(5);

    const jobs = platforms.map(async platform => {
        let rows = [];
        switch (platform.type) {
            case 'facebook':
                rows = await facebookService.getAllMetricsRows(
                    id_customer,
                    platform.id_facebook_page,
                    platform.access_token,
                    since,
                    endDate
                );
                return metricsRepo.insertFacebookMetrics(rows);

            case 'google':
                rows = await googleService.getAllMetricsRows(
                    id_customer,
                    google,
                    since,
                    endDate
                );
                return metricsRepo.insertGoogleAnalyticsMetrics(rows);

            case 'instagram':
                rows = await instagramService.getAllMetricsRows(
                    id_customer,
                    platform.id_instagram_page,
                    platform.access_token,
                    since,
                    endDate
                );
                return metricsRepo.insertInstagramMetrics(rows);

            case 'linkedin':
                rows = await linkedinService.getAllMetricsRows(
                    id_customer,
                    platform.id_linkedin_organization,
                    since,
                    endDate
                );
                return metricsRepo.insertLinkedinMetrics(rows);

            default:
                return Promise.resolve();
        }
    });

    await Promise.all(jobs);
}

module.exports = { processCustomerMetrics };