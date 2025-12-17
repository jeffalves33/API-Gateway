// Arquivo: public/js/dashboardPage.js
document.addEventListener('DOMContentLoaded', async function () {
    const defaultAvatar = '/assets/img/avatars/default-avatar.png';
    const customerListElement = document.getElementById('dropdown-customer-list');
    const selectedCustomerNameElement = document.getElementById('selected-customer-name');
    const userNameElement = document.getElementById('user-name');
    const reachChartContainer = document.getElementById('reachChart');
    const contentDashboard = document.getElementById('content-dashboard');
    const impressionsChartContainer = document.getElementById('impressionsChart');
    const followersChartContainer = document.getElementById('followersChart');
    const instructionMessage = document.getElementById('instruction-message'); // <- Agora existe no HTML
    const facebookSecoundCardReach = document.getElementById('facebook-secound-card-reach')
    const totalContentSummary = document.getElementById('content-total-posts');
    const totalEngagementSummary = document.getElementById('content-total-engagement');
    const totalLikesSummary = document.getElementById('content-total-likes');
    const totalCommentsSummary = document.getElementById('content-total-comments');
    const instagramSecoundCardReach = document.getElementById('instagram-secound-card-reach')
    const facebookSecoundCardImpressions = document.getElementById('facebook-secound-card-impressions')
    const instagramSecoundCardImpressions = document.getElementById('instagram-secound-card-impressions')
    const googleAnalyticsSecoundCardImpressions = document.getElementById('googleAnalytics-secound-card-impressions')
    const linkedinSecoundCardImpressions = document.getElementById('linkedin-secound-card-impressions')
    const userProfileAvatarElements = document.querySelectorAll('.user-profile-avatar');


    let reachChartInstance = null;
    let trafficChartInstance = null;
    let newLeadsChartInstance = null;
    let followersChartInstance = null;
    let impressionsChartInstance = null;
    let searchVolumeChartInstance = null;
    let trafficSourcesChartInstance = null;
    let userId = null;

    function updateSelectedCustomerDisplay(name) {
        selectedCustomerNameElement.textContent = name || 'Cliente';
    }

    function saveSelectedCustomer(id, name, facebookPageId) {
        localStorage.setItem('selectedCustomerId', id);
        localStorage.setItem('selectedCustomerName', name);
        localStorage.setItem('selectedCustomerFacebookPageId', facebookPageId || '');
    }

    function restoreSelectedCustomer() {
        try {
            const savedName = localStorage.getItem('selectedCustomerName');
            const savedId = localStorage.getItem('selectedCustomerId');

            if (savedName && savedId && savedName.length < 100 && /^\d+$/.test(savedId)) {
                updateSelectedCustomerDisplay(savedName);
            }
        } catch (error) {
            showError('Erro ao restaurar cliente', error);
            localStorage.removeItem('selectedCustomerName');
            localStorage.removeItem('selectedCustomerId');
        }
    }

    async function loadUserProfile() {
        try {
            const response = await fetch('/api/profile');
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Erro ao carregar perfil');
            }
            const data = await response.json();
            userNameElement.textContent = data.user.name;
            userId = data.user.id_user;
            userProfileAvatarElements.forEach(element => {
                element.src = data.user.foto_perfil || defaultAvatar;
            });
        } catch (error) {
            showError('Erro ao carregar perfil', error);
        }
    }

    async function loadCustomers() {
        try {
            const response = await fetch('/customer');
            if (!response.ok) throw new Error('Erro ao buscar clientes');

            const { customers } = await response.json();
            customerListElement.innerHTML = '';

            customers.forEach(customer => {
                const item = document.createElement('li');
                item.innerHTML = `
                    <a class="dropdown-item dropdown-customer-list-items" href="#" 
                       data-id="${customer.id_customer}" 
                       data-name="${customer.name}"
                       data-facebook-page-id="${customer.id_facebook_page || ''}">
                      ${customer.name}
                    </a>`;
                customerListElement.appendChild(item);
            });

            customerListElement.innerHTML += `
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item" href="/platformsPage.html">Adicionar cliente</a></li>
            `;

            document.querySelectorAll('.dropdown-customer-list-items').forEach(item => {
                item.addEventListener('click', async function (e) {
                    e.preventDefault();
                    const id = this.getAttribute('data-id');
                    const name = this.getAttribute('data-name');
                    const facebookPageId = this.getAttribute('data-facebook-page-id');

                    saveSelectedCustomer(id, name, facebookPageId);
                    updateSelectedCustomerDisplay(name);

                    if (userId && id) {
                        try {
                            const response = await fetch('/customer/cache', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id_user: userId, id_customer: id })
                            });

                            if (!response.ok) {
                                const data = await response.json();
                                throw new Error(data.message || 'Erro ao atualizar chaves');
                            }
                        } catch (error) {
                            showError('Erro ao atualizar cache de chaves', error);
                        }
                    }
                });
            });
        } catch (error) {
            showError('Erro ao carregar clientes', error);
        }
    }

    async function fetchAndRenderReachChart(startDate, endDate, id_customer) {
        reachChartContainer.style.display = 'none';

        try {
            const res = await fetch('/api/metrics/reach', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_customer, startDate, endDate })
            });
            if (!res.ok) {
                throw new Error(`Erro HTTP: ${res.status} - ${res.statusText}`);
            }
            const data = await res.json();
            renderReachChart(data);
            reachChartContainer.style.display = 'block';
        } catch (error) {
            showError('Erro ao buscar dados de alcance', error);
        }
    }

    async function fetchAndRenderImpressionsChart(startDate, endDate, id_customer) {
        impressionsChartContainer.style.display = 'none';

        try {
            const res = await fetch('/api/metrics/impressions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_customer, startDate, endDate })
            });
            if (!res.ok) {
                throw new Error(`Erro HTTP: ${res.status} - ${res.statusText}`);
            }
            const data = await res.json();
            renderImpressionsChart(data);
            impressionsChartContainer.style.display = 'block';
        } catch (error) {
            showError('Erro ao buscar dados de impressões', error);
        }
    }

    async function fetchAndRenderFollowersChart(startDate, endDate, id_customer) {
        if (followersChartContainer) followersChartContainer.style.display = 'none';

        try {
            const res = await fetch('/api/metrics/followers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_customer, startDate, endDate })
            });
            if (!res.ok) throw new Error(`Erro HTTP: ${res.status} - ${res.statusText}`);

            const data = await res.json();
            const vals = {
                facebook: Number(data?.facebook || 0),
                instagram: Number(data?.instagram || 0),
                linkedin: Number(data?.linkedin || 0),
                youtube: Number(data?.youtube || 0),
            };

            const ids = {
                facebook: 'followers-facebook-total',
                instagram: 'followers-instagram-total',
                linkedin: 'followers-linkedin-total',
                youtube: 'followers-youtube-total'
            };

            Object.entries(ids).forEach(([key, elId]) => {
                const el = document.getElementById(elId);
                if (el) el.textContent = new Intl.NumberFormat('pt-BR').format(vals[key]);
            });
        } catch (error) {
            showError('Erro ao buscar dados de seguidores', error);
        }
    }

    async function fetchAndRenderTrafficChart(startDate, endDate, id_customer) {
        try {
            const res = await fetch('/api/metrics/traffic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_customer, startDate, endDate })
            });
            if (!res.ok) {
                throw new Error(`Erro HTTP: ${res.status} - ${res.statusText}`);
            }
            const data = await res.json();
            renderTrafficLineChart(data);    // Gráfico de linha principal
            renderTrafficSourcesChart(data); // Pizza + lista de fontes
        } catch (error) {
            showError('Erro ao buscar dados de tráfego', error);
        }
    }

    async function fetchAndRenderSearchVolumeChart(startDate, endDate, id_customer) {
        try {
            const res = await fetch('/api/metrics/search-volume', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_customer, startDate, endDate })
            });
            if (!res.ok) throw new Error(`Erro HTTP: ${res.status} - ${res.statusText}`);

            const data = await res.json();
            renderSearchVolumeLineChart(data);
            renderSearchVolumeCards(data);
        } catch (error) {
            showError('Erro ao buscar dados de volume de pesquisa', error);
        }
    }

    async function fetchAndRenderContentChart(startDate, endDate, id_customer) {
        try {
            const res = await fetch('/api/contents/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_customer, startDate, endDate })
            });
            if (!res.ok) throw new Error(`Erro HTTP: ${res.status} - ${res.statusText}`);

            const data = await res.json();

            lastContentsData = data;
            renderContentSummary(data);
            renderTopPosts(data);
            renderContentPostsTable(data);
        } catch (error) {
            showError('Erro ao buscar dados de volume de pesquisa', error);
        }
    }

    function renderReachChart(data) {
        if (!data || !data.facebook || !data.instagram || !data.labels) {
            showError('Dados inválidos recebidos', data);
            return;
        }
        facebookSecoundCardReach.textContent = data.facebook.reduce((sum, value) => sum + value, 0);
        instagramSecoundCardReach.textContent = data.instagram.reduce((sum, value) => sum + value, 0);
        return new Promise((resolve) => {
            if (reachChartInstance) reachChartInstance.destroy();

            reachChartInstance = new ApexCharts(reachChartContainer, {
                series: [
                    { name: 'Facebook', data: data.facebook },
                    { name: 'Instagram', data: data.instagram }
                ],
                chart: {
                    height: 400,
                    type: 'line',
                    toolbar: { show: true },
                    animations: { enabled: true, easing: 'easeinout', speed: 800 },
                    dropShadow: { enabled: true, top: 3, left: 2, blur: 4, opacity: 0.1 },
                    events: {
                        animationEnd: function () {
                            resolve(); // Resolve quando a animação terminar
                        }
                    }
                },
                colors: ['#0d6efd', '#dc3545'],
                dataLabels: { enabled: false },
                stroke: { curve: 'smooth', width: 3 },
                grid: { borderColor: '#e0e0e0', strokeDashArray: 5 },
                markers: { size: 0 },
                xaxis: {
                    categories: data.labels,
                    labels: {
                        formatter: val => new Date(val).toLocaleDateString('pt-BR'),
                        style: { fontSize: '10px', fontWeight: 500 }
                    },
                    crosshairs: { show: true, stroke: { color: '#b6b6b6', width: 1, dashArray: 3 } }
                },
                yaxis: {
                    labels: {
                        formatter: val => new Intl.NumberFormat('pt-BR').format(val),
                        style: { fontSize: '12px', fontWeight: 500 }
                    }
                },
                legend: {
                    position: 'top',
                    horizontalAlign: 'center',
                    fontSize: '14px',
                    fontWeight: 500,
                    markers: { width: 10, height: 10, radius: 4 },
                    itemMargin: { horizontal: 15, vertical: 5 }
                },
                tooltip: {
                    theme: 'light',
                    shared: true,
                    intersect: false,
                    style: { fontSize: '13px' },
                    y: {
                        formatter: val => new Intl.NumberFormat('pt-BR').format(val)
                    }
                },
                responsive: [
                    {
                        breakpoint: 768,
                        options: {
                            chart: { height: 250 },
                            legend: { position: 'bottom', horizontalAlign: 'center' }
                        }
                    },
                    {
                        breakpoint: 576,
                        options: {
                            chart: { height: 200 },
                            xaxis: { labels: { rotate: -45 } }
                        }
                    }
                ]
            });

            reachChartInstance.render();
        });
    }

    function renderImpressionsChart(data) {
        if (!data || !data.facebook || !data.instagram || !data.google || !data.labels) {
            showError('Dados inválidos recebidos', data);
            return;
        }
        facebookSecoundCardImpressions.textContent = data.facebook.reduce((sum, value) => sum + value, 0);
        instagramSecoundCardImpressions.textContent = data.instagram.reduce((sum, value) => sum + value, 0);
        googleAnalyticsSecoundCardImpressions.textContent = data.google.reduce((sum, value) => sum + value, 0);
        return new Promise((resolve) => {
            if (impressionsChartInstance) impressionsChartInstance.destroy();

            impressionsChartInstance = new ApexCharts(impressionsChartContainer, {
                series: [
                    { name: 'Facebook', data: data.facebook },
                    { name: 'Instagram', data: data.instagram },
                    { name: 'Google Analytics', data: data.google },
                    { name: 'Linkedin', data: data.linkedin }
                ],
                chart: {
                    height: 400,
                    type: 'line',
                    toolbar: { show: true },
                    animations: { enabled: true, easing: 'easeinout', speed: 800 },
                    dropShadow: { enabled: true, top: 3, left: 2, blur: 4, opacity: 0.1 },
                    events: {
                        animationEnd: function () {
                            resolve();
                        }
                    }
                },
                colors: ['#0d6efd', '#dc3545', '#28a745', '#202020'],
                dataLabels: { enabled: false },
                stroke: { curve: 'smooth', width: 3 },
                grid: { borderColor: '#e0e0e0', strokeDashArray: 5 },
                markers: { size: 0 },
                xaxis: {
                    categories: data.labels,
                    labels: {
                        formatter: val => new Date(val).toLocaleDateString('pt-BR'),
                        style: { fontSize: '10px', fontWeight: 500 }
                    },
                    crosshairs: { show: true, stroke: { color: '#b6b6b6', width: 1, dashArray: 3 } }
                },
                yaxis: {
                    labels: {
                        formatter: val => new Intl.NumberFormat('pt-BR').format(val),
                        style: { fontSize: '12px', fontWeight: 500 }
                    }
                },
                legend: {
                    position: 'top',
                    horizontalAlign: 'center',
                    fontSize: '14px',
                    fontWeight: 500,
                    markers: { width: 10, height: 10, radius: 4 },
                    itemMargin: { horizontal: 15, vertical: 5 }
                },
                tooltip: {
                    theme: 'light',
                    shared: true,
                    intersect: false,
                    style: { fontSize: '13px' },
                    y: {
                        formatter: val => new Intl.NumberFormat('pt-BR').format(val)
                    }
                },
                responsive: [
                    {
                        breakpoint: 768,
                        options: {
                            chart: { height: 250 },
                            legend: { position: 'bottom', horizontalAlign: 'center' }
                        }
                    },
                    {
                        breakpoint: 576,
                        options: {
                            chart: { height: 200 },
                            xaxis: { labels: { rotate: -45 } }
                        }
                    }
                ]
            });

            impressionsChartInstance.render();
        });
    }

    function renderfollowersChart(data) {
        let cardColor, headingColor, axisColor, shadeColor, borderColor;

        cardColor = config.colors.cardColor;
        headingColor = config.colors.headingColor;
        axisColor = config.colors.axisColor;
        borderColor = config.colors.borderColor;
        if (data.facebook === undefined || data.instagram === undefined ||
            data.linkedin === undefined || data.youtube === undefined) {
            showError('Dados inválidos recebidos', data);
            return;
        }
        return new Promise((resolve) => {
            if (followersChartInstance) followersChartInstance.destroy();

            followersChartInstance = new ApexCharts(followersChartContainer, {
                series: [
                    {
                        name: 'Atual',
                        data: [data.facebook, data.instagram, data.linkedin, data.youtube]
                    }
                ],
                chart: {
                    height: 300,
                    stacked: false,
                    type: 'bar',
                    toolbar: { show: false }
                },
                plotOptions: {
                    bar: {
                        horizontal: false,
                        columnWidth: '33%',
                        borderRadius: 12,
                        startingShape: 'rounded',
                        endingShape: 'rounded',
                        distributed: true //permite cores para colunas diferentes
                    }
                },
                colors: ['#0D6EFD', '#DC3545', '#1300D6', '#E52D27'],
                //colors: [config.colors.primary, config.colors.info],
                dataLabels: {
                    enabled: false
                },
                stroke: {
                    curve: 'smooth',
                    width: 6,
                    lineCap: 'round',
                    colors: [cardColor]
                },
                legend: {
                    show: true,
                    horizontalAlign: 'left',
                    position: 'top',
                    markers: {
                        height: 8,
                        width: 8,
                        radius: 12,
                        offsetX: -3
                    },
                    labels: {
                        colors: axisColor
                    },
                    itemMargin: {
                        horizontal: 10
                    }
                },
                grid: {
                    borderColor: borderColor,
                    padding: {
                        top: 0,
                        bottom: -8,
                        left: 20,
                        right: 20
                    }
                },
                xaxis: {
                    categories: ['Facebook', 'Instagram', 'Linkedin', 'Youtube'],
                    labels: {
                        style: {
                            fontSize: '13px',
                            colors: axisColor
                        }
                    },
                    axisTicks: {
                        show: false
                    },
                    axisBorder: {
                        show: false
                    }
                },
                yaxis: {
                    labels: {
                        style: {
                            fontSize: '13px',
                            colors: axisColor
                        }
                    }
                },
                legend: {
                    position: 'top',
                    horizontalAlign: 'center',
                    fontSize: '14px',
                    fontWeight: 500,
                    markers: { width: 10, height: 10, radius: 4 },
                    itemMargin: { horizontal: 15, vertical: 5 }
                },
                responsive: [
                    {
                        breakpoint: 768,
                        options: {
                            chart: { height: 250 },
                            legend: { position: 'bottom', horizontalAlign: 'center' }
                        }
                    },
                    {
                        breakpoint: 576,
                        options: {
                            chart: { height: 200 },
                            xaxis: { labels: { rotate: -45 } }
                        }
                    }
                ],
                states: {
                    hover: {
                        filter: {
                            type: 'none'
                        }
                    },
                    active: {
                        filter: {
                            type: 'none'
                        }
                    }
                }
            });

            followersChartInstance.render();
        });
    }

    function renderTrafficLineChart(data) {
        if (!data || !data.sessions || !data.labels) {
            showError('Dados inválidos recebidos', data);
            return;
        }
        return new Promise((resolve) => {
            const trafficChartContainer = document.querySelector('#trafficChart');

            if (trafficChartInstance) trafficChartInstance.destroy();

            const formattedDates = data.labels.map(dateStr => {
                if (!dateStr) return '';
                return new Date(
                    dateStr.substring(0, 4) + '-' + dateStr.substring(4, 6) + '-' + dateStr.substring(6, 8)
                ).toLocaleDateString('pt-BR');
            });

            trafficChartInstance = new ApexCharts(trafficChartContainer, {
                chart: {
                    height: 400,
                    type: 'line',
                    toolbar: { show: true },
                    events: {
                        animationEnd: function () {
                            resolve();
                        }
                    }
                },
                series: [
                    {
                        name: 'Sessões',
                        data: data.sessions
                    }
                ],
                xaxis: {
                    categories: formattedDates
                },
                stroke: {
                    curve: 'smooth',
                    width: 3
                },
                colors: ['#0d6efd'],
                dataLabels: { enabled: false },
                markers: {
                    size: 0
                },
                tooltip: {
                    theme: 'light',
                    shared: true,
                    intersect: false,
                    style: { fontSize: '13px' },
                    y: {
                        formatter: val => new Intl.NumberFormat('pt-BR').format(val)
                    }
                }
            });

            trafficChartInstance.render();
        });
    }

    function renderTrafficSourcesChart(data) {
        if (!data || !data.sessions || !data.labels) {
            showError('Dados inválidos recebidos', data);
            return;
        }
        return new Promise((resolve) => {
            const pizzaChartContainer = document.querySelector('#orderTrafficPizzaChart');
            const trafficSourcesList = document.querySelector('#traffic-sources-list');
            const totalTrafficElement = document.getElementById('total-traffic-period');

            if (trafficSourcesChartInstance) trafficSourcesChartInstance.destroy();

            const sources = data.sources || {};
            const labels = Object.keys(sources);
            const series = Object.values(sources);
            const translationMap = {
                'Unassigned': 'Não Atribuído',
                'Direct': 'Direto',
                'Organic Search': 'Busca Orgânica',
                'Organic Social': 'Social Orgânico'
            };

            const total = series.reduce((acc, val) => acc + val, 0);
            totalTrafficElement.textContent = total.toLocaleString('pt-BR');

            trafficSourcesChartInstance = new ApexCharts(pizzaChartContainer, {
                chart: {
                    height: 165,
                    width: 130,
                    type: 'donut',
                    events: {
                        animationEnd: function () {
                            resolve();
                        }
                    }
                },
                labels: labels.map(label => translationMap[label] || label),
                series: series,
                colors: ['#0d6efd', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6610f2'],
                stroke: {
                    width: 5,
                    colors: ['#fff']
                },
                dataLabels: {
                    enabled: false
                },
                legend: { show: false },
                plotOptions: {
                    pie: {
                        donut: {
                            size: '75%',
                            labels: {
                                show: true,
                                value: {
                                    fontSize: '1.5rem',
                                    offsetY: -15,
                                    formatter: val => parseInt(val) + '%'
                                },
                                name: {
                                    offsetY: 20
                                },
                                total: {
                                    show: true,
                                    label: 'Total',
                                    formatter: function (w) {
                                        return total;
                                    }
                                }
                            }
                        }
                    }
                }
            });

            trafficSourcesChartInstance.render();

            // Gerar lista dinâmica UL
            if (trafficSourcesList) {
                trafficSourcesList.innerHTML = '';

                labels.forEach((label, index) => {
                    const colorClasses = ['primary', 'success', 'warning', 'danger', 'info', 'secondary'];
                    const colorClass = colorClasses[index % colorClasses.length];

                    const item = `
                    <li class="d-flex mb-4 pb-1">
                        <div class="avatar flex-shrink-0 me-3">
                        <span class="avatar-initial rounded bg-label-${colorClass}">
                            <i class="bx bx-globe"></i>
                        </span>
                        </div>
                        <div class="d-flex w-100 flex-wrap align-items-center justify-content-between gap-2">
                        <div class="me-2">
                            <h6 class="mb-0">${translationMap[label] || label}</h6>
                            <small class="text-muted">Fonte de Tráfego</small>
                        </div>
                        <div class="user-progress">
                            <small class="fw-medium">${sources[label]}</small>
                        </div>
                        </div>
                    </li>
                    `;
                    trafficSourcesList.innerHTML += item;
                });
            }
        });
    }

    function renderSearchVolumeLineChart(data) {
        if (!data || !data.labels) {
            showError('Dados inválidos recebidos', data);
            return;
        }
        return new Promise((resolve) => {
            const searchVolumeChartContainer = document.querySelector('#searchVolumChart');

            if (searchVolumeChartInstance) searchVolumeChartInstance.destroy();

            const formattedDates = data.labels.map(dateStr => {
                if (!dateStr) return '';
                return new Date(
                    dateStr.substring(0, 4) + '-' + dateStr.substring(4, 6) + '-' + dateStr.substring(6, 8)
                ).toLocaleDateString('pt-BR');
            });

            searchVolumeChartInstance = new ApexCharts(searchVolumeChartContainer, {
                chart: {
                    height: 400,
                    type: 'line',
                    toolbar: { show: true },
                    events: {
                        animationEnd: function () {
                            resolve();
                        }
                    }
                },
                series: [
                    {
                        name: 'Visitas por busca',
                        data: data.organicSessions || []
                    }
                ],
                xaxis: {
                    categories: formattedDates
                },
                stroke: {
                    curve: 'smooth',
                    width: 3
                },
                colors: ['#696CFF'],
                dataLabels: { enabled: false },
                markers: { size: 0 },
                tooltip: {
                    y: {
                        formatter: val => parseInt(val)
                    }
                }
            });

            searchVolumeChartInstance.render();
        });
    }

    function renderSearchVolumeCards(data) {
        if (!data || !data.labels) {
            showError('Dados inválidos recebidos', data);
            return;
        }
        return new Promise((resolve) => {
            // Atualizar quantidade e crescimento Organic Search
            document.getElementById('organic-search-qtd').textContent = data.totalOrganicSearch;
            /*document.getElementById('organic-search-percent').innerHTML = `
                <i class="bx ${data.percentOrganicSearch >= 0 ? 'bx-up-arrow-alt text-success' : 'bx-down-arrow-alt text-danger'}"></i>
                ${Math.abs(data.percentOrganicSearch)}%
            `;*/

            // Atualizar quantidade e crescimento Outras Fontes
            document.getElementById('other-sources-qtd').textContent = data.totalOtherSources;
            /*document.getElementById('other-sources-percent').innerHTML = `
                <i class="bx ${data.percentOtherSources >= 0 ? 'bx-up-arrow-alt text-success' : 'bx-down-arrow-alt text-danger'}"></i>
                ${Math.abs(data.percentOtherSources)}%
            `;*/

            // Atualizar quantidade de Novos Leads
            document.getElementById('new-leads-qtd').textContent = data.totalNewLeads;
            document.getElementById('new-leads-qtd-days').textContent = `${data.days} dias`;

            // Renderizar o mini gráfico Sparkline
            const newLeadsChartContainer = document.querySelector('#newLeadsChart');

            if (newLeadsChartInstance) newLeadsChartInstance.destroy();

            newLeadsChartInstance = new ApexCharts(newLeadsChartContainer, {
                chart: {
                    height: 80,
                    type: 'line',
                    toolbar: { show: false },
                    dropShadow: {
                        enabled: true,
                        top: 10,
                        left: 5,
                        blur: 3,
                        color: '#FFC107',
                        opacity: 0.15
                    },
                    sparkline: { enabled: true },
                    events: {
                        animationEnd: function () {
                            resolve();
                        }
                    }
                },
                grid: {
                    show: false,
                    padding: { right: 8 }
                },
                colors: ['#FFC107'],
                dataLabels: { enabled: false },
                stroke: {
                    width: 5,
                    curve: 'smooth'
                },
                series: [
                    {
                        data: data.newLeadsPerDay || []
                    }
                ],
                xaxis: {
                    show: false,
                    lines: { show: false },
                    labels: { show: false },
                    axisBorder: { show: false }
                },
                yaxis: { show: false }
            });

            newLeadsChartInstance.render();
        });
    }

    function renderContentSummary(data) {
        if (
            !data ||
            data.amountContents == null ||
            data.totalComments == null ||
            data.totalEngagement == null ||
            data.totalLikes == null ||
            !Array.isArray(data.facebook) ||
            !Array.isArray(data.instagram) ||
            !Array.isArray(data.labels)
        ) {
            showError('Dados inválidos de sumário de posts', data);
            return;
        }

        totalCommentsSummary.textContent = data.totalComments || '0';
        totalContentSummary.textContent = data.amountContents || '0';
        totalEngagementSummary.textContent = data.totalEngagement || '0';
        totalLikesSummary.textContent = data.totalLikes || '0';
    }

    function renderTopPosts(data) {
        if (
            !data ||
            data.amountContents == null ||
            data.totalComments == null ||
            data.totalEngagement == null ||
            data.totalLikes == null ||
            !Array.isArray(data.facebook) ||
            !Array.isArray(data.instagram) ||
            !Array.isArray(data.labels)
        ) {
            showError('Dados inválidos recebidos de top posts', data);
            return;
        }

        // Normaliza posts (FB + IG) para um formato único
        const posts = [
            ...data.facebook.map((p) => {
                const likes = p.reactions?.summary?.total_count ?? 0;
                const comments = p.comments?.summary?.total_count ?? 0;
                const shares = p.shares?.count ?? 0;

                return {
                    platform: 'facebook',
                    platformLabel: 'Facebook',
                    platformIcon: 'bx bxl-facebook',
                    platformBadge: 'bg-label-primary',
                    postTitle: p.message || 'Post do Facebook',
                    likes,
                    comments,
                    shares,
                    reach: 0, // não vem no payload atual
                    permalink: p.permalink_url || '#',
                    createdTime: p.created_time || null,
                    picture: p.full_picture || null,
                    engagement: likes + comments + shares,
                };
            }),
            ...data.instagram.map((p) => {
                const likes = p.like_count ?? 0;
                const comments = p.comments_count ?? 0;
                const shares = 0; // IG não tem shares no seu payload atual

                return {
                    platform: 'instagram',
                    platformLabel: 'Instagram',
                    platformIcon: 'bx bxl-instagram',
                    platformBadge: 'bg-label-danger',
                    postTitle: p.message || 'Post do Instagram',
                    likes,
                    comments,
                    shares,
                    reach: 0, // não vem no payload atual
                    permalink: p.permalink_url || '#',
                    createdTime: p.created_time || null,
                    picture: p.full_picture || null,
                    engagement: likes + comments + shares,
                };
            }),
        ];

        // Top 3 por engajamento (likes + comments + shares)
        const top = posts
            .sort((a, b) => b.engagement - a.engagement)
            .slice(0, 3);

        const container = document.getElementById('topPostsRow');
        if (!container) return;

        if (top.length === 0) {
            container.innerHTML = `
            <div class="col-12">
                <div class="card">
                <div class="card-body text-muted">Sem posts no período selecionado.</div>
                </div>
            </div>
            `;
            return;
        }

        container.innerHTML = top
            .map((p, idx) => {
                const rank = idx + 1;

                return `
                <div class="col-12 col-md-4">
                <div class="card h-100 border">
                    <div class="card-body">
                    <div class="d-flex align-items-start justify-content-between mb-3">
                        <div class="d-flex align-items-center gap-2">
                        <div class="avatar">
                            <span class="avatar-initial rounded ${p.platformBadge}">
                            <i class="${p.platformIcon}"></i>
                            </span>
                        </div>
                        <div class="d-flex flex-column">
                            <div class="d-flex align-items-center gap-2">
                            <small class="text-warning fw-semibold">🏅 #${rank}</small>
                            <small class="text-muted">${p.platformLabel}</small>
                            </div>
                        </div>
                        </div>

                        <div class="dropdown">
                        <button class="btn p-0" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                            <i class="bx bx-dots-vertical-rounded"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li><a class="dropdown-item" href="javascript:void(0)">Ver detalhes</a></li>
                            <li><a class="dropdown-item" href="${p.permalink}" target="_blank" rel="noopener">Abrir post</a></li>
                        </ul>
                        </div>
                    </div>

                    <h6 class="mb-3">${escapeHtml(p.postTitle.slice(0, 50))}...</h6>

                    <div class="d-flex flex-column gap-2">
                        <div class="d-flex align-items-center justify-content-between">
                        <small class="text-muted"><i class="bx bx-heart text-danger me-1"></i> Curtidas</small>
                        <small class="fw-semibold">${formatNumber(p.likes)}</small>
                        </div>
                        <div class="d-flex align-items-center justify-content-between">
                        <small class="text-muted"><i class="bx bx-message-rounded-dots text-info me-1"></i> Comentários</small>
                        <small class="fw-semibold">${formatNumber(p.comments)}</small>
                        </div>
                        <div class="d-flex align-items-center justify-content-between">
                        <small class="text-muted"><i class="bx bx-share-alt text-success me-1"></i> Compartilh.</small>
                        <small class="fw-semibold">${formatNumber(p.shares)}</small>
                        </div>
                        <div class="d-flex align-items-center justify-content-between">
                        <small class="text-muted"><i class="bx bx-show text-primary me-1"></i> Alcance</small>
                        <small class="fw-semibold">${formatNumber(p.reach)}</small>
                        </div>
                        <div class="d-flex align-items-center justify-content-between pt-2 border-top">
                        <small class="text-muted">Engajamento</small>
                        <small class="fw-semibold">${formatNumber(p.engagement)}</small>
                        </div>
                    </div>
                    </div>
                </div>
                </div>
            `;
            })
            .join('');
    }

    function renderContentPostsTable(data) {
        if (!data || !Array.isArray(data.facebook) || !Array.isArray(data.instagram)) {
            showError('Dados inválidos recebidos de listagem de posts', data);
            return;
        }

        const tbody = document.getElementById('contentPostsTbody');
        if (!tbody) return;

        // Normaliza FB + IG
        const posts = [
            ...data.facebook.map((p) => {
                const likes = p.reactions?.summary?.total_count ?? 0;
                const comments = p.comments?.summary?.total_count ?? 0;
                const shares = p.shares?.count ?? 0;

                return {
                    platform: 'facebook',
                    publishedAt: p.created_time,
                    postTitle: p.message || 'Post do Facebook',
                    platformLabel: 'Facebook',
                    platformIcon: 'bx bxl-facebook',
                    platformBadge: 'bg-label-primary',
                    typeLabel: 'Feed',
                    likes,
                    comments,
                    shares,
                    reach: 0,
                    permalink: p.permalink_url || '#',
                };
            }),
            ...data.instagram.map((p) => {
                const likes = p.like_count ?? 0;
                const comments = p.comments_count ?? 0;

                return {
                    platform: 'instagram',
                    publishedAt: p.created_time,
                    postTitle: p.message || 'Post do Instagram',
                    platformLabel: 'Instagram',
                    platformIcon: 'bx bxl-instagram',
                    platformBadge: 'bg-label-danger',
                    typeLabel:
                        p.media_type === 'CAROUSEL_ALBUM'
                            ? 'Carrossel'
                            : p.media_type === 'VIDEO'
                                ? 'Vídeo'
                                : 'Imagem',
                    likes,
                    comments,
                    shares: 0,
                    reach: 0,
                    permalink: p.permalink_url || '#',
                };
            }),
        ];

        // ==========================
        // Filtro + Ordenação
        // ==========================
        let filtered = posts;

        if (contentPostsState.platform !== 'all') {
            filtered = filtered.filter(p => p.platform === contentPostsState.platform);
        }

        const dateValue = (d) => {
            const t = Date.parse(d);
            return Number.isFinite(t) ? t : 0;
        };

        filtered.sort((a, b) => {
            const byDateDesc = dateValue(b.publishedAt) - dateValue(a.publishedAt);
            const byDateAsc = dateValue(a.publishedAt) - dateValue(b.publishedAt);
            const byPlatform = (a.platform || '').localeCompare(b.platform || '');

            switch (contentPostsState.sort) {
                case 'date_asc':
                    return byDateAsc;

                case 'platform_asc':
                    // plataforma, e desempata por data desc
                    return byPlatform || byDateDesc;

                case 'platform_then_date':
                    return byPlatform || byDateDesc;

                case 'date_then_platform':
                    return byDateDesc || byPlatform;

                case 'date_desc':
                default:
                    return byDateDesc;
            }
        });

        // Paginação
        const total = filtered.length;
        const totalPages = Math.max(1, Math.ceil(total / contentPostsState.pageSize));
        const safePage = Math.min(Math.max(contentPostsState.page, 1), totalPages);
        contentPostsState.page = safePage;

        const startIdx = (safePage - 1) * contentPostsState.pageSize;
        const endIdx = Math.min(startIdx + contentPostsState.pageSize, total);
        const pageItems = filtered.slice(startIdx, endIdx);

        // Render tabela
        tbody.innerHTML = pageItems
            .map(
                (p) => `
      <tr>
        <td>${formatDateBR(p.publishedAt)}</td>
        <td><span class="fw-medium">${escapeHtml(p.postTitle.slice(0, 40))}...</span></td>
        <td>
          <span class="badge ${p.platformBadge}">
            <i class="${p.platformIcon} me-1"></i>
          </span>
        </td>
        <td>${escapeHtml(p.typeLabel)}</td>
        <td class="text-end">${formatNumber(p.likes)}</td>
        <td class="text-end">${formatNumber(p.comments)}</td>
        <td class="text-end">${formatNumber(p.shares)}</td>
        <td class="text-end">${formatNumber(p.reach)}</td>
        <td class="text-center">
          <div class="dropdown">
            <button class="btn p-0" type="button" data-bs-toggle="dropdown">
              <i class="bx bx-dots-vertical-rounded"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li><a class="dropdown-item" href="javascript:void(0)">Ver detalhes</a></li>
              <li><a class="dropdown-item" href="${p.permalink}" target="_blank" rel="noopener">Abrir post</a></li>
            </ul>
          </div>
        </td>
      </tr>
    `
            )
            .join('');

        // Info
        const info = document.getElementById('contentPostsPaginationInfo');
        if (info) {
            info.textContent = total === 0
                ? 'Nenhum post encontrado'
                : `Mostrando ${startIdx + 1}-${endIdx} de ${total} posts`;
        }

        // Paginação HTML
        const pagination = document.getElementById('contentPostsPagination');
        if (pagination) {
            const prev = safePage > 1 ? safePage - 1 : 1;
            const next = safePage < totalPages ? safePage + 1 : totalPages;

            const maxButtons = 7;
            const pages = buildPaginationWindow(safePage, totalPages, maxButtons);

            pagination.innerHTML = `
      <li class="page-item ${safePage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${prev}">
          <i class="bx bx-chevron-left"></i>
        </a>
      </li>
      ${pages
                    .map((n) =>
                        n === '…'
                            ? `<li class="page-item disabled"><span class="page-link">…</span></li>`
                            : `<li class="page-item ${n === safePage ? 'active' : ''}">
                 <a class="page-link" href="#" data-page="${n}">${n}</a>
               </li>`
                    )
                    .join('')}
      <li class="page-item ${safePage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${next}">
          <i class="bx bx-chevron-right"></i>
        </a>
      </li>
    `;
        }
    }


    // helpers
    const contentPostsState = {
        page: 1,
        pageSize: 10,
        platform: 'all',          // 'all' | 'facebook' | 'instagram'
        sort: 'date_desc',        // default SEMPRE por data
        sortTie: 'platform_then_date' // 'platform_then_date' | 'date_then_platform'
    };

    let lastContentsData = null;

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    function formatNumber(n) {
        return new Intl.NumberFormat('pt-BR').format(Number(n || 0));
    }

    function formatDateBR(date) {
        try {
            return new Date(date).toLocaleDateString('pt-BR');
        } catch {
            return '-';
        }
    }

    function escapeHtml(str) {
        return String(str || '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function buildPaginationWindow(current, totalPages, maxButtons) {
        if (totalPages <= maxButtons) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        const windowSize = maxButtons - 2; // reserva espaço para ellipsis
        let start = Math.max(2, current - Math.floor(windowSize / 2));
        let end = Math.min(totalPages - 1, start + windowSize - 1);

        // ajusta start se end encostar
        start = Math.max(2, end - windowSize + 1);

        const pages = [1];

        if (start > 2) pages.push('…');

        for (let i = start; i <= end; i++) pages.push(i);

        if (end < totalPages - 1) pages.push('…');

        pages.push(totalPages);
        return pages;
    }

    // ============================
    // CONTEÚDOS (MOCK + RENDER)
    // ============================
    /*let contentPostsState = {
        posts: [],
        page: 1,
        pageSize: 10
    };

    function renderContentMock() {
        // evita re-render duplicado (caso usuário clique Buscar várias vezes)
        if (contentPostsState.posts && contentPostsState.posts.length > 0) {
            renderContentSummary(contentPostsState.posts);
            renderTopPosts(contentPostsState.posts);
            renderContentPostsTable();
            return;
        }

        contentPostsState.posts = buildMockPosts(27); // 27 posts pra testar paginação
        contentPostsState.page = 1;

        renderContentSummary(contentPostsState.posts);
        renderTopPosts(contentPostsState.posts);
        renderContentPostsTable();

        // paginação click (delegação)
        const pagination = document.getElementById('contentPostsPagination');
        if (pagination && !pagination.dataset.bound) {
            pagination.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-page]');
                if (!btn) return;
                e.preventDefault();

                const next = Number(btn.getAttribute('data-page'));
                const totalPages = Math.max(1, Math.ceil(contentPostsState.posts.length / contentPostsState.pageSize));
                if (Number.isNaN(next) || next < 1 || next > totalPages) return;

                contentPostsState.page = next;
                renderContentPostsTable();
            });
            pagination.dataset.bound = '1';
        }
    }*/

    function updateProgressBar(percentage, text) {
        const loadingBar = document.getElementById('loading-bar');
        const loadingText = document.getElementById('loading-text');
        const loadingPercentage = document.getElementById('loading-percentage');

        if (loadingBar) {
            loadingBar.style.width = `${percentage}%`;
            loadingBar.setAttribute('aria-valuenow', percentage);
        }

        if (loadingText && text) {
            loadingText.textContent = text;
        }

        if (loadingPercentage) {
            loadingPercentage.textContent = `${Math.round(percentage)}%`;
        }
    }

    // Funções de controle de loading
    function showProgressBar() {
        const formDashboard = document.getElementById('form-busca');
        const loadingProgress = document.getElementById('loading-progress');
        const instructionMessage = document.getElementById('instruction-message');
        const contentDashboard = document.getElementById('content-dashboard');

        if (formDashboard) formDashboard.style.display = 'none';
        if (loadingProgress) loadingProgress.style.display = 'block';
        if (instructionMessage) instructionMessage.style.display = 'none';
        if (contentDashboard) contentDashboard.style.display = 'none';
    }

    function hideProgressBar() {
        const loadingProgress = document.getElementById('loading-progress');
        if (loadingProgress) loadingProgress.style.display = 'none';
    }

    /*function buildMockPosts(count) {
        const platforms = [
            { key: 'instagram', label: 'Instagram', badge: 'bg-label-danger', icon: 'bx bxl-instagram' },
            { key: 'facebook', label: 'Facebook', badge: 'bg-label-primary', icon: 'bx bxl-facebook' },
            { key: 'linkedin', label: 'LinkedIn', badge: 'bg-label-info', icon: 'bx bxl-linkedin' }
        ];

        const types = [
            { key: 'feed', label: 'Feed' },
            { key: 'reels', label: 'Reels' },
            { key: 'carrossel', label: 'Carrossel' }
        ];

        const titles = [
            'Lançamento de Produto',
            'Dica do Dia',
            'Promoção Black Friday',
            'Case de Sucesso',
            'Bastidores da Equipe',
            'Webinar Gratuito',
            'Checklist do Mês',
            'Antes e Depois',
            'FAQ Rápido'
        ];

        // datas fictícias recentes
        const base = new Date();
        const posts = [];

        for (let i = 0; i < count; i++) {
            const p = platforms[i % platforms.length];
            const t = types[i % types.length];
            const title = titles[i % titles.length] + ` #${i + 1}`;

            const date = new Date(base);
            date.setDate(base.getDate() - (count - i));

            const reach = 800 + (i * 70) + Math.floor(Math.random() * 250);
            const likes = 80 + (i * 9) + Math.floor(Math.random() * 60);
            const comments = 8 + Math.floor(i * 1.2) + Math.floor(Math.random() * 15);
            const shares = 3 + Math.floor(i * 0.8) + Math.floor(Math.random() * 10);

            posts.push({
                id: `mock-${i + 1}`,
                publishedAt: date,
                postTitle: title,
                platformKey: p.key,
                platformLabel: p.label,
                platformBadge: p.badge,
                platformIcon: p.icon,
                typeLabel: t.label,
                likes,
                comments,
                shares,
                reach
            });
        }

        // ordena por engajamento (likes+comments+shares) desc
        posts.sort((a, b) => (b.likes + b.comments + b.shares) - (a.likes + a.comments + a.shares));
        return posts;
    }

    function renderContentSummary(posts) {
        const totalPosts = posts.length;
        const totalEngagement = posts.reduce((acc, p) => acc + p.likes + p.comments + p.shares, 0);
        const totalReach = posts.reduce((acc, p) => acc + p.reach, 0);
        const engagementRate = totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0;

        setText('content-total-posts', formatNumber(totalPosts));
        setText('content-total-engagement', formatNumber(totalEngagement));
        setText('content-engagement-rate', `${engagementRate.toFixed(1)}%`);

        // deltas fictícios (por enquanto)
        //setText('content-total-posts-delta', '↗ +12% vs período anterior');
        //setText('content-total-engagement-delta', '↗ +24% vs período anterior');
        //setText('content-engagement-rate-delta', '↗ +1.2% vs período anterior');

        // melhor horário fictício (vai virar algoritmo depois)
        //setText('content-best-hour', '18h');
        //setText('content-best-hour-sub', 'Seg–Sex, 18h–20h');
    }
*/

    document.addEventListener('change', (e) => {
        const pf = e.target.closest('#contentPostsPlatformFilter');
        const so = e.target.closest('#contentPostsSort');

        if (pf) {
            contentPostsState.platform = pf.value; // all|facebook|instagram
            contentPostsState.page = 1;
            if (lastContentsData) renderContentPostsTable(lastContentsData);
        }

        if (so) {
            contentPostsState.sort = so.value; // date_desc|date_asc|platform_then_date|date_then_platform|platform_asc
            contentPostsState.page = 1;
            if (lastContentsData) renderContentPostsTable(lastContentsData);
        }
    });

    document.addEventListener('click', function (e) {
        const link = e.target.closest('#contentPostsPagination a.page-link');
        if (!link) return;

        e.preventDefault();

        const page = Number(link.dataset.page);
        if (!Number.isFinite(page)) return;

        contentPostsState.page = page;

        if (lastContentsData) {
            renderContentPostsTable(lastContentsData);
        }
    });

    document.getElementById('log-out')?.addEventListener('click', logout);

    restoreSelectedCustomer();
    await loadUserProfile();
    await loadCustomers();

    const formBusca = document.getElementById('form-busca');
    const previousState = {
        dashboardVisible: contentDashboard.style.display !== 'none',
        instructionVisible: instructionMessage.style.display !== 'none'
    };
    if (formBusca) {
        formBusca.addEventListener('submit', async function (e) {
            e.preventDefault();
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;

            if (!startDate || !endDate) {
                showWarning('Por favor, selecione as datas antes de buscar');
                return;
            }

            const btnBuscarTexto = document.getElementById('btn-buscar-texto');
            const btnBuscarLoading = document.getElementById('btn-buscar-loading');

            const formatToISO = (dateStr) => {
                const [day, month, year] = dateStr.split('/');
                return `${year}-${month}-${day}`;
            };

            try {
                const id_customer = localStorage.getItem('selectedCustomerId');
                if (!id_customer) {
                    showWarning('Selecione um cliente.');
                } else {
                    // Mostra loading no botão
                    btnBuscarTexto.classList.add('d-none');
                    btnBuscarLoading.classList.remove('d-none');
                    showProgressBar();
                    const loadingSteps = [
                        { name: 'Carregando alcance...', fn: () => fetchAndRenderReachChart(formatToISO(startDate), formatToISO(endDate), id_customer) },
                        { name: 'Carregando impressões...', fn: () => fetchAndRenderImpressionsChart(formatToISO(startDate), formatToISO(endDate), id_customer) },
                        { name: 'Carregando seguidores...', fn: () => fetchAndRenderFollowersChart(formatToISO(startDate), formatToISO(endDate), id_customer) },
                        { name: 'Carregando tráfego...', fn: () => fetchAndRenderTrafficChart(formatToISO(startDate), formatToISO(endDate), id_customer) },
                        { name: 'Carregando volume...', fn: () => fetchAndRenderSearchVolumeChart(formatToISO(startDate), formatToISO(endDate), id_customer) },
                        { name: 'Carregando resumo de conteúdo...', fn: () => fetchAndRenderContentChart(formatToISO(startDate), formatToISO(endDate), id_customer) },
                        // etc...
                    ];
                    // Executa todas as buscas e aguarda TODAS terminarem completamente
                    for (let i = 0; i < loadingSteps.length; i++) {
                        updateProgressBar((i / loadingSteps.length) * 100, loadingSteps[i].name);
                        await loadingSteps[i].fn();
                    }
                    updateProgressBar(100, 'Concluído!');
                    setTimeout(() => {
                        hideProgressBar();
                        //renderContentMock();
                        // Exibe dashboard e esconde instrução APENAS após tudo estar renderizado
                        formBusca.style.display = 'block';
                        if (instructionMessage) instructionMessage.style.display = 'none';
                        if (contentDashboard) contentDashboard.style.display = 'block';
                    }, 500);
                }
            } catch (error) {
                showError('Erro ao buscar dados do dashboard', error);
                // restaurar estado anterior
                contentDashboard.style.display = previousState.dashboardVisible ? 'block' : 'none';
                instructionMessage.style.display = previousState.instructionVisible ? 'block' : 'none';
                showError('Erro ao buscar dados. Tente novamente.');
            } finally {
                // Remove loading APENAS após tudo estar completamente renderizado
                btnBuscarTexto.classList.remove('d-none');
                btnBuscarLoading.classList.add('d-none');
            }
        });
    }
});
