// Arquivo: public/js/dashboardPage.js
document.addEventListener('DOMContentLoaded', async function () {
    const customerListElement = document.getElementById('dropdown-customer-list');
    const selectedCustomerNameElement = document.getElementById('selected-customer-name');
    const userNameElement = document.getElementById('user-name');
    const reachChartContainer = document.getElementById('reachChart');
    const impressionsChartContainer = document.getElementById('impressionsChart');
    const followersChartContainer = document.getElementById('followersChart');

    let reachChartInstance = null;
    let trafficChartInstance = null;
    let followersChartInstance = null;
    let impressionsChartInstance = null;
    let trafficSourcesChartInstance = null;
    let userId = null;

    function updateSelectedCustomerDisplay(name) {
        selectedCustomerNameElement.textContent = name || 'Cliente';
    }

    function saveSelectedCustomer(id, name) {
        localStorage.setItem('selectedCustomerId', id);
        localStorage.setItem('selectedCustomerName', name);
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
            const response = await fetch('/api/customers');
            if (!response.ok) throw new Error('Erro ao buscar clientes');

            const { customers } = await response.json();
            customerListElement.innerHTML = '';

            customers.forEach(customer => {
                const item = document.createElement('li');
                item.innerHTML = `
                    <a class="dropdown-item dropdown-customer-list-items" href="#" 
                       data-id="${customer.id_customer}" 
                       data-name="${customer.name}">
                      ${customer.name}
                    </a>`;
                customerListElement.appendChild(item);
            });

            customerListElement.innerHTML += `
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item" href="#">Adicionar cliente</a></li>
            `;

            document.querySelectorAll('.dropdown-customer-list-items').forEach(item => {
                item.addEventListener('click', async function (e) {
                    e.preventDefault();
                    const id = this.getAttribute('data-id');
                    const name = this.getAttribute('data-name');

                    saveSelectedCustomer(id, name);
                    updateSelectedCustomerDisplay(name);
                    console.log(`Cliente selecionado: ${id}`);

                    if (userId && id) {
                        try {
                            const response = await fetch('/api/customers/cache', {
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

        const btnBuscarTexto = document.getElementById('btn-buscar-texto');
        const btnBuscarLoading = document.getElementById('btn-buscar-loading');

        reachChartContainer.style.display = 'none';
        btnBuscarTexto.classList.add('d-none');
        btnBuscarLoading.classList.remove('d-none');

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
        } finally {
            btnBuscarTexto.classList.remove('d-none');
            btnBuscarLoading.classList.add('d-none');
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

    function renderReachChart(data) {
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
                dropShadow: { enabled: true, top: 3, left: 2, blur: 4, opacity: 0.1 }
            },
            colors: ['#0d6efd', '#dc3545'],
            dataLabels: { enabled: false },
            stroke: { curve: 'smooth', width: 3 },
            grid: { borderColor: '#e0e0e0', strokeDashArray: 5 },
            markers: { size: 6, strokeWidth: 3, hover: { size: 8 } },
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
    }

    function renderImpressionsChart(data) {
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
                dropShadow: { enabled: true, top: 3, left: 2, blur: 4, opacity: 0.1 }
            },
            colors: ['#0d6efd', '#dc3545', '#28a745', '#202020'],
            dataLabels: { enabled: false },
            stroke: { curve: 'smooth', width: 3 },
            grid: { borderColor: '#e0e0e0', strokeDashArray: 5 },
            markers: { size: 6, strokeWidth: 3, hover: { size: 8 } },
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
    }

    function renderfollowersChart(data) {
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
                dropShadow: { enabled: true, top: 3, left: 2, blur: 4, opacity: 0.1 }
            },
            colors: ['#0d6efd'],
            dataLabels: { enabled: false },
            stroke: { curve: 'smooth', width: 3 },
            grid: { borderColor: '#e0e0e0', strokeDashArray: 5 },
            markers: { size: 6, strokeWidth: 3, hover: { size: 8 } },
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

        // Para Instagram, LinkedIn e YouTube → mostrar número em cards
        document.getElementById('instagram-followers-count').textContent = data.instagram;
        document.getElementById('linkedin-followers-count').textContent = data.linkedin;
        document.getElementById('youtube-followers-count').textContent = data.youtube;
    }

    function renderTrafficLineChart(data) {
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
                toolbar: { show: true }
            },
            series: [
                {
                    name: 'Sessões',
                    data: data.sessions
                }
            ],
            xaxis: {
                categories: formattedDates // Já mandar as datas formatadas
            },
            stroke: {
                curve: 'smooth',
                width: 3
            },
            colors: ['#0d6efd'],
            dataLabels: { enabled: false },
            markers: {
                size: 5
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
    }


    function renderTrafficSourcesChart(data) {
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
                type: 'donut'
            },
            labels: labels,
            series: series,
            colors: ['#0d6efd', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6610f2'], // Azul, Verde, Amarelo, Vermelho, Ciano, Roxo
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
    }

    document.getElementById('log-out').addEventListener('click', logout);

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

            const formatToISO = (dateStr) => {
                const [day, month, year] = dateStr.split('/');
                return `${year}-${month}-${day}`;
            };

            await fetchAndRenderReachChart(formatToISO(startDate), formatToISO(endDate));
            await fetchAndRenderImpressionsChart(formatToISO(startDate), formatToISO(endDate));
            await fetchAndRenderFollowersChart(formatToISO(startDate), formatToISO(endDate));
            await fetchAndRenderTrafficChart(formatToISO(startDate), formatToISO(endDate));
        });
    }
});
