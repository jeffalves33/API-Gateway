// Arquivo: public/js/dashboardPage.js
document.addEventListener('DOMContentLoaded', async function () {
    const customerListElement = document.getElementById('dropdown-customer-list');
    const selectedCustomerNameElement = document.getElementById('selected-customer-name');
    const userNameElement = document.getElementById('user-name');
    const reachChartContainer = document.getElementById('reachChart');
    const contentDashboard = document.getElementById('content-dashboard');
    const impressionsChartContainer = document.getElementById('impressionsChart');
    const followersChartContainer = document.getElementById('followersChart');
    const instructionMessage = document.getElementById('instruction-message'); // <- Agora existe no HTML
    const facebookSecoundCardReach = document.getElementById('facebook-secound-card-reach')
    const instagramSecoundCardReach = document.getElementById('instagram-secound-card-reach')
    const facebookSecoundCardImpressions = document.getElementById('facebook-secound-card-impressions')
    const instagramSecoundCardImpressions = document.getElementById('instagram-secound-card-impressions')
    const googleAnalyticsSecoundCardImpressions = document.getElementById('googleAnalytics-secound-card-impressions')
    const linkedinSecoundCardImpressions = document.getElementById('linkedin-secound-card-impressions')


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
        const savedName = localStorage.getItem('selectedCustomerName');
        if (savedName) {
            updateSelectedCustomerDisplay(savedName);
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
        } catch (error) {
            console.error('Erro ao carregar perfil:', error);
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
                            console.error('Erro ao atualizar cache de chaves:', error);
                        }
                    }
                });
            });
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
        }
    }

    async function logout() {
        try {
            const response = await fetch('/api/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Erro ao fazer logout');
            }

            localStorage.clear();
            window.location.href = '/';
        } catch (error) {
            const alertContainer = document.getElementById('alert-container');
            if (alertContainer) {
                alertContainer.innerHTML = `
                  <div class="alert alert-danger alert-dismissible fade show" role="alert">
                    ${error.message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
                  </div>`;
            }
        }
    }

    async function fetchAndRenderReachChart(startDate, endDate) {
        const id_customer = localStorage.getItem('selectedCustomerId');
        if (!id_customer) return;

        reachChartContainer.style.display = 'none';

        try {
            const res = await fetch('/api/metrics/reach', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_customer, startDate, endDate })
            });
            const data = await res.json();
            renderReachChart(data);
            reachChartContainer.style.display = 'block';
        } catch (error) {
            console.error('Erro ao buscar dados de alcance:', error);
        }
    }

    async function fetchAndRenderImpressionsChart(startDate, endDate) {
        const id_customer = localStorage.getItem('selectedCustomerId');
        if (!id_customer) return;

        impressionsChartContainer.style.display = 'none';

        try {
            const res = await fetch('/api/metrics/impressions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_customer, startDate, endDate })
            });

            const data = await res.json();
            renderImpressionsChart(data);
            impressionsChartContainer.style.display = 'block';
        } catch (error) {
            console.error('Erro ao buscar dados de impressões:', error);
        }
    }

    async function fetchAndRenderFollowersChart(startDate, endDate) {
        const id_customer = localStorage.getItem('selectedCustomerId');
        if (!id_customer) return;

        followersChartContainer.style.display = 'none';

        try {
            const res = await fetch('/api/metrics/followers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_customer, startDate, endDate })
            });

            const data = await res.json();
            renderfollowersChart(data);
            followersChartContainer.style.display = 'block';
        } catch (error) {
            console.error('Erro ao buscar dados de seguidores:', error);
        }
    }

    async function fetchAndRenderTrafficChart(startDate, endDate) {
        const id_customer = localStorage.getItem('selectedCustomerId');
        if (!id_customer) return;

        try {
            const res = await fetch('/api/metrics/traffic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_customer, startDate, endDate })
            });

            const data = await res.json();
            renderTrafficLineChart(data);    // Gráfico de linha principal
            renderTrafficSourcesChart(data); // Pizza + lista de fontes
        } catch (error) {
            console.error('Erro ao buscar dados de tráfego:', error);
        }
    }

    async function fetchAndRenderSearchVolumeChart(startDate, endDate) {
        const id_customer = localStorage.getItem('selectedCustomerId');
        if (!id_customer) return;

        try {
            const res = await fetch('/api/metrics/search-volume', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_customer, startDate, endDate })
            });

            const data = await res.json();
            renderSearchVolumeLineChart(data);
            renderSearchVolumeCards(data);
        } catch (error) {
            console.error('Erro ao buscar dados de volume de pesquisa:', error);
        }
    }

    function renderReachChart(data) {
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
                responsive: [{
                    breakpoint: 576,
                    options: {
                        chart: { height: 280 },
                        markers: { size: 4 },
                        legend: { position: 'bottom' }
                    }
                }]
            });

            reachChartInstance.render();
        });
    }

    function renderImpressionsChart(data) {
        facebookSecoundCardImpressions.textContent = data.facebook.reduce((sum, value) => sum + value, 0);
        instagramSecoundCardImpressions.textContent = data.instagram.reduce((sum, value) => sum + value, 0);
        googleAnalyticsSecoundCardImpressions.textContent = data.google.reduce((sum, value) => sum +value, 0);
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
                responsive: [{
                    breakpoint: 576,
                    options: {
                        chart: { height: 280 },
                        markers: { size: 4 },
                        legend: { position: 'bottom' }
                    }
                }]
            });

            impressionsChartInstance.render();
        });
    }

    function renderfollowersChart(data) {
        return new Promise((resolve) => {
            if (followersChartInstance) followersChartInstance.destroy();

            followersChartInstance = new ApexCharts(followersChartContainer, {
                series: [
                    { name: 'Facebook', data: data.facebook }
                ],
                chart: {
                    height: 400,
                    type: 'line',
                    toolbar: { show: true },
                    animations: { enabled: true, easing: 'easeinout', speed: 800 },
                    dropShadow: { enabled: true, top: 3, left: 2, blur: 4, opacity: 0.1 },
                    events: {
                        animationEnd: function () {
                            // Atualizar os cards após a animação
                            document.getElementById('instagram-followers-count').textContent = data.instagram;
                            document.getElementById('linkedin-followers-count').textContent = data.linkedin;
                            document.getElementById('youtube-followers-count').textContent = data.youtube;
                            resolve();
                        }
                    }
                },
                colors: ['#0d6efd'],
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
                responsive: [{
                    breakpoint: 576,
                    options: {
                        chart: { height: 280 },
                        markers: { size: 4 },
                        legend: { position: 'bottom' }
                    }
                }]
            });

            followersChartInstance.render();
        });
    }

    function renderTrafficLineChart(data) {
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
        return new Promise((resolve) => {
            const pizzaChartContainer = document.querySelector('#orderTrafficPizzaChart');
            const trafficSourcesList = document.querySelector('#traffic-sources-list');
            const totalTrafficElement = document.getElementById('total-traffic-period');

            if (trafficSourcesChartInstance) trafficSourcesChartInstance.destroy();

            const sources = data.sources || {};
            const labels = Object.keys(sources);
            const series = Object.values(sources);

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
                labels: labels,
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
                    <h6 class="mb-0">${label}</h6>
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
        return new Promise((resolve) => {
            // Atualizar quantidade e crescimento Organic Search
            document.getElementById('organic-search-qtd').textContent = data.totalOrganicSearch;
            document.getElementById('organic-search-percent').innerHTML = `
          <i class="bx ${data.percentOrganicSearch >= 0 ? 'bx-up-arrow-alt text-success' : 'bx-down-arrow-alt text-danger'}"></i>
          ${Math.abs(data.percentOrganicSearch)}%
        `;

            // Atualizar quantidade e crescimento Outras Fontes
            document.getElementById('other-sources-qtd').textContent = data.totalOtherSources;
            document.getElementById('other-sources-percent').innerHTML = `
          <i class="bx ${data.percentOtherSources >= 0 ? 'bx-up-arrow-alt text-success' : 'bx-down-arrow-alt text-danger'}"></i>
          ${Math.abs(data.percentOtherSources)}%
        `;

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

    document.getElementById('log-out')?.addEventListener('click', logout);

    restoreSelectedCustomer();
    await loadUserProfile();
    await loadCustomers();

    const formBusca = document.getElementById('form-busca');
    if (formBusca) {
        formBusca.addEventListener('submit', async function (e) {
            e.preventDefault();
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;

            if (!startDate || !endDate) {
                alert('Por favor, selecione as datas antes de buscar');
                return;
            }

            const btnBuscarTexto = document.getElementById('btn-buscar-texto');
            const btnBuscarLoading = document.getElementById('btn-buscar-loading');

            const formatToISO = (dateStr) => {
                const [day, month, year] = dateStr.split('/');
                return `${year}-${month}-${day}`;
            };

            try {
                // Mostra loading no botão
                btnBuscarTexto.classList.add('d-none');
                btnBuscarLoading.classList.remove('d-none');
                // Executa todas as buscas e aguarda TODAS terminarem completamente
                await Promise.all([
                    fetchAndRenderReachChart(formatToISO(startDate), formatToISO(endDate)),
                    fetchAndRenderImpressionsChart(formatToISO(startDate), formatToISO(endDate)),
                    fetchAndRenderFollowersChart(formatToISO(startDate), formatToISO(endDate)),
                    fetchAndRenderTrafficChart(formatToISO(startDate), formatToISO(endDate)),
                    fetchAndRenderSearchVolumeChart(formatToISO(startDate), formatToISO(endDate))
                ]);

                // Exibe dashboard e esconde instrução APENAS após tudo estar renderizado
                if (instructionMessage) instructionMessage.style.display = 'none';
                if (contentDashboard) contentDashboard.style.display = 'block';

            } catch (error) {
                console.error('Erro ao buscar dados do dashboard:', error);
                alert('Erro ao buscar dados. Tente novamente.');
            } finally {
                // Remove loading APENAS após tudo estar completamente renderizado
                btnBuscarTexto.classList.remove('d-none');
                btnBuscarLoading.classList.add('d-none');
            }
        });
    }
});
