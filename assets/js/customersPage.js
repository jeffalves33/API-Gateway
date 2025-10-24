document.addEventListener('DOMContentLoaded', async () => {
    const facebookPagesList = document.getElementById('facebook-pages-list');
    const googleAnalyticsPagesList = document.getElementById('googleAnalytics-pages-list');
    const instagramPagesList = document.getElementById('instagram-pages-list');
    const linkedinOrganizationsList = document.getElementById('linkedin-pages-list');
    const youtubeChannelsList = document.getElementById('youtube-pages-list');

    function clearLoadingIndicator(container) {
        const loadingIndicator = container.querySelector('.loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }
    }

    try {
        const responseCustomers = await fetch('/customer');
        if (!responseCustomers.ok) {
            throw new Error(`Erro ao carregar clientes: ${responseCustomers.status}`);
        }
        const { customers } = await responseCustomers.json();

        const registeredFacebookIds = customers.map(c => c.id_facebook_page).filter(id => id !== null);
        const registeredGooglePropertyIds = customers.map(c => c.id_googleanalytics_property).filter(id => id !== null);
        const registeredInstagramIds = customers.map(c => c.id_instagram_page).filter(id => id !== null);
        const registeredLinkedinOrganizationIds = customers.map(c => c.id_linkedin_organization).filter(id => id !== null);
        const registeredYoutubePropertyIds = customers.map(c => c.id_youtube_property).filter(id => id !== null);

        const responseMeta = await fetch('/api/meta/pages');
        if (!responseMeta.ok) {
            clearLoadingIndicator(facebookPagesList);
            clearLoadingIndicator(instagramPagesList);
            //facebookPagesList.innerHTML = '<div class="alert alert-warning">Erro ao carregar páginas do Facebook/Instagram</div>';
            //instagramPagesList.innerHTML = '<div class="alert alert-warning">Erro ao carregar páginas do Facebook/Instagram</div>';
        } else {
            const pagesJsonMeta = await responseMeta.json();
            const { facebook, instagram } = pagesJsonMeta;
            // Facebook Pages
            clearLoadingIndicator(facebookPagesList);
            facebook.forEach(page => {
                if (registeredFacebookIds.includes(page.id_page)) return;

                const div = document.createElement('div');
                div.classList.add('form-check');
                div.innerHTML = `
                        <input class="form-check-input" name="fb-pages" type="radio"
                        id="fb-page-${page.id_page}" value="${page.id_page}"
                        data-access-token="${page.access_token}" />
                        <label class="form-check-label" for="fb-page-${page.id_page}">
                        ${page.name}
                        </label>
                    `;
                facebookPagesList.appendChild(div);
            });

            // Instagram Pages
            clearLoadingIndicator(instagramPagesList);
            instagram.forEach(page => {
                if (registeredInstagramIds.includes(page.id_page)) return;

                const div = document.createElement('div');
                div.classList.add('form-check');
                div.innerHTML = `
                        <input class="form-check-input" name="ig-pages" type="radio"
                        id="ig-page-${page.id_page}" value="${page.id_page}"
                        data-access-token="${page.access_token}" />
                        <label class="form-check-label" for="ig-page-${page.id_page}">
                        ${page.name}
                        </label>
                    `;
                instagramPagesList.appendChild(div);
            });
        }

        const responseGoogleAnalytics = await fetch('/api/googleAnalytics/properties');
        if (!responseGoogleAnalytics.ok) {
            clearLoadingIndicator(googleAnalyticsPagesList);
            googleAnalyticsPagesList.innerHTML = '<div class="alert alert-warning">Erro ao carregar propriedades do Google Analytics</div>';
        } else {
            const pagesJsonGoogleAnalytics = await responseGoogleAnalytics.json();
            const { google } = pagesJsonGoogleAnalytics;

            // Google Analytics Properties
            clearLoadingIndicator(googleAnalyticsPagesList);
            google.forEach(property => {
                if (registeredGooglePropertyIds.includes(property.id_property)) return;

                const div = document.createElement('div');
                div.classList.add('form-check');
                div.innerHTML = `
                            <input class="form-check-input" name="ga-pages" type="radio"
                            id="ga-property-${property.propertyIdNumber || property.id_property}" 
                            value="${property.id_property}" />
                            <label class="form-check-label" for="ga-property-${property.propertyIdNumber || property.id_property}">
                            ${property.displayName}
                            </label>
                        `;
                googleAnalyticsPagesList.appendChild(div);
            });
        }

        const responseYouTube = await fetch('/api/youtube/channels');
        if (!responseYouTube.ok) {
            clearLoadingIndicator(youtubeChannelsList);
            youtubeChannelsList.innerHTML = '<div class="alert alert-danger">Erro ao carregar canais do YouTube</div>';
        } else {
            const pagesJsonYouTube = await responseYouTube.json();
            const { youtube } = pagesJsonYouTube;

            clearLoadingIndicator(youtubeChannelsList);
            youtube.forEach(ch => {
                //if (registeredYouTubeChannelIds.includes(ch.id_channel)) return;

                const div = document.createElement('div');
                div.classList.add('form-check');
                div.innerHTML = `
                            <input class="form-check-input" name="yt-channels" type="radio"
                                    id="yt-channel-${ch.id_channel}" value="${ch.id_channel}" />
                            <label class="form-check-label" for="yt-channel-${ch.id_channel}">
                                ${ch.title} ${ch.customUrl ? `(${ch.customUrl})` : ''} 
                                ${ch.subscriberCount ? ` — ${ch.subscriberCount} inscritos` : ''}
                            </label>
                        `;
                youtubeChannelsList.appendChild(div);
            });
        }

        const responseLinkedin = await fetch('/api/linkedin/organizations');
        if (!responseLinkedin.ok) {
            clearLoadingIndicator(linkedinOrganizationsList);
            linkedinOrganizationsList.innerHTML = '<div class="alert alert-warning">Erro ao carregar páginas do LinkedIn </div>';
        } else {
            const pagesJsonLinkedin = await responseLinkedin.json();
            const { linkedin } = pagesJsonLinkedin;

            clearLoadingIndicator(linkedinOrganizationsList);
            linkedin.forEach(page => {
                if (registeredLinkedinOrganizationIds.includes(String(page.id))) return;
                const div = document.createElement('div');
                div.classList.add('form-check');
                div.innerHTML = `
                        <input class="form-check-input" name="linkedin-pages" type="radio"
                        id="linkedin-organization-${page.id}" value="${page.id}"
                        data-access-token="${page.access_token}" />
                        <label class="form-check-label" for="linkedin-organization-${page.id}">
                        ${page.name}
                        </label>
                    `;
                linkedinOrganizationsList.appendChild(div);
            });
        }

    } catch (error) {
        showError("Erro ao listar contas de plataformas", error);
        clearLoadingIndicator(facebookPagesList);
        clearLoadingIndicator(googleAnalyticsPagesList);
        clearLoadingIndicator(instagramPagesList);
        clearLoadingIndicator(linkedinOrganizationsList);

        facebookPagesList.innerHTML = '<div class="alert alert-danger">Erro ao carregar dados</div>';
        googleAnalyticsPagesList.innerHTML = '<div class="alert alert-danger">Erro ao carregar dados</div>';
        instagramPagesList.innerHTML = '<div class="alert alert-danger">Erro ao carregar dados</div>';
        linkedinOrganizationsList.innerHTML = '<div class="alert alert-danger">Erro ao carregar dados</div>';
    }
});

document.getElementById('add-customer-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const overlay = document.getElementById('loading-overlay');
    overlay.style.display = 'flex';

    const name = document.getElementById('customer-name').value;
    const company = document.getElementById('customer-company').value;
    const email = document.getElementById('customer-email').value;
    const phone = document.getElementById('customer-phone').value;

    const selectedFb = document.querySelector('input[name="fb-pages"]:checked');
    const selectedGA = document.querySelector('input[name="ga-pages"]:checked');
    const selectedIg = document.querySelector('input[name="ig-pages"]:checked');
    const selectedLinkedin = document.querySelector('input[name="linkedin-pages"]:checked');

    const platforms = [];

    if (selectedFb) {
        platforms.push({
            type: 'facebook',
            id_facebook_page: selectedFb.value,
            access_token: selectedFb.dataset.accessToken
        });
    }

    if (selectedGA) {
        platforms.push({
            type: 'google',
            id_googleanalytics_property: selectedGA.value
        });
    }

    if (selectedIg) {
        platforms.push({
            type: 'instagram',
            id_instagram_page: selectedIg.value,
            access_token: selectedIg.dataset.accessToken
        });
    }

    if (selectedLinkedin) {
        platforms.push({
            type: 'linkedin',
            id_linkedin_organization: selectedLinkedin.value
        });
    }

    if (platforms.length === 0) {
        overlay.style.display = 'none';
        const alertDiv = document.getElementById('feedback-message');
        alertDiv.className = 'alert alert-warning';
        alertDiv.style.display = 'block';
        alertDiv.textContent = 'Selecione ao menos uma página/propriedade para continuar.';
        setTimeout(() => alertDiv.style.display = 'none', 5000);
        return;
    }

    if (!name.trim() || !email.trim()) {
        overlay.style.display = 'none';
        const alertDiv = document.getElementById('feedback-message');
        alertDiv.className = 'alert alert-warning';
        alertDiv.style.display = 'block';
        alertDiv.textContent = 'Nome e email são obrigatórios.';
        setTimeout(() => alertDiv.style.display = 'none', 5000);
        return;
    }

    const payload = { name, company, email, phone, platforms };

    try {
        const response = await fetch('/customer/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) showSuccess('Cliente adicionado com sucesso!')
        else showError('Erro ao adicionar cliente. Tente novamente.')
    } catch (error) {
        showError('Erro ao adicionar cliente. Tente novamente.')
    }
});
