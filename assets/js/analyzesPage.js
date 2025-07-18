// public/js/analyzesPage.js
document.addEventListener('DOMContentLoaded', async function () {
    const btnBuscarTexto = document.getElementById('btn-buscar-texto');
    const btnBuscarLoading = document.getElementById('btn-buscar-loading');
    const instructionMessage = document.getElementById('instruction-message');
    const contentDashboard = document.getElementById('content-dashboard');
    const customerListElement = document.getElementById('dropdown-customer-list');
    const selectedCustomerNameElement = document.getElementById('selected-customer-name');
    const userNameElement = document.getElementById('user-name');

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

    document.getElementById('log-out')?.addEventListener('click', logout);

    restoreSelectedCustomer();
    await loadUserProfile();
    await loadCustomers();

    async function validateForm() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const facebook = document.getElementById('facebook').checked;
        const instagram = document.getElementById('instagram').checked;
        const googleAnalytics = document.getElementById('googleAnalytics').checked;
        const tipoAnalise = document.querySelector('input[name="tipoAnalise"]:checked');
        const formatoRelatorio = document.getElementById('formatoRelatorio').value;

        if (!userId) {
            return false;
        }

        if (!startDate || !endDate) {
            alert('Por favor, selecione a data inicial e final.');
            return false;
        }

        if (!facebook && !instagram && !googleAnalytics) {
            alert('Por favor, selecione pelo menos uma plataforma.');
            return false;
        }

        if (!tipoAnalise) {
            alert('Por favor, selecione o tipo de análise.');
            return false;
        }

        if (formatoRelatorio === 'Selecione' || formatoRelatorio === '' || formatoRelatorio === null) {
            alert('Por favor, selecione o formato do relatório.');
            return false;
        }

        return true;
    }

    document.getElementById('form-busca')?.addEventListener('submit', async function (e) {
        const id_customer = localStorage.getItem('selectedCustomerId');
        if (!id_customer) return;

        e.preventDefault();

        const isValid = await validateForm();
        if (!isValid) return;

        try {
            btnBuscarTexto.classList.add('d-none');
            btnBuscarLoading.classList.remove('d-none');

            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            const tipoAnalise = document.querySelector('input[name="tipoAnalise"]:checked').id;
            const formatoRelatorio = document.getElementById('formatoRelatorio').value;

            // Determina a plataforma (primeira marcada)
            let platform = [];
            if (document.getElementById('instagram').checked) platform.push('instagram');
            if (document.getElementById('facebook').checked) platform.push('facebook');
            if (document.getElementById('googleAnalytics').checked) platform.push('google_analytics');

            const requestBody = {
                agency_id: String(userId),
                client_id: id_customer,
                platforms: platform,
                analysis_type: tipoAnalise.replace('descritiva', 'descriptive').replace('prescritiva', 'prescriptive').replace('preditiva', 'predictive'),
                start_date: formatDateToISO(startDate),
                end_date: formatDateToISO(endDate),
                output_format: formatoRelatorio
            };

            const response = await fetch('https://analyze-backend-5jyg.onrender.com/analyze/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error('Erro ao gerar análise');
            }

            const result = await response.json();

            if (instructionMessage) instructionMessage.style.display = 'none';
            if (contentDashboard) {
                renderAnalyzeResult(result);
                contentDashboard.style.display = 'block';
            }

        } catch (error) {
            console.error('Erro ao gerar análise:', error);
            alert('Erro ao gerar análise. Tente novamente.');
        } finally {
            btnBuscarTexto.classList.remove('d-none');
            btnBuscarLoading.classList.add('d-none');
        }
    });

    function formatDateToISO(dateStr) {
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month}-${day}`;
    }

    function renderAnalyzeResult(data) {
        const resultMarkdown = data.result || '';
        // Converte o markdown para HTML
        const htmlFormatted = marked.parse(resultMarkdown);

        contentDashboard.innerHTML = `
        <div class="card p-4 shadow-sm border-0">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h4 class="mb-0">Análise Gerada</h4>
                <button id="download-pdf" class="btn btn-outline-primary">
                    <i class="bi bi-download me-2"></i>Baixar PDF
                </button>
            </div>
            <div class="markdown-body" id="analysis-content">
                ${htmlFormatted}
            </div>
        </div>
    `;

        // Adiciona o event listener para o botão de download
        document.getElementById('download-pdf')?.addEventListener('click', downloadAsPDF);
    }

    async function downloadAsPDF() {
        try {
            const { jsPDF } = window.jspdf;
            const element = document.getElementById('analysis-content');

            if (!element) {
                alert('Conteúdo não encontrado para download.');
                return;
            }

            // Mostra loading no botão
            const downloadBtn = document.getElementById('download-pdf');
            const originalContent = downloadBtn.innerHTML;
            downloadBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Gerando PDF...';
            downloadBtn.disabled = true;

            // Captura o elemento como imagem
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');

            // Dimensões da página A4
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            // Calcula as dimensões da imagem
            const imgWidth = pageWidth - 20; // margem de 10mm de cada lado
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 10; // margem superior

            // Adiciona a primeira página
            pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
            heightLeft -= (pageHeight - 20); // subtrai a altura da página menos margens

            // Adiciona páginas adicionais se necessário
            while (heightLeft > 0) {
                position = heightLeft - imgHeight + 10;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
                heightLeft -= (pageHeight - 20);
            }

            // Nome do arquivo com data atual
            const now = new Date();
            const dateStr = now.toLocaleDateString('pt-BR').replace(/\//g, '-');
            const customerName = localStorage.getItem('selectedCustomerName') || 'Cliente';
            const fileName = `Analise_${customerName}_${dateStr}.pdf`;

            // Faz o download
            pdf.save(fileName);

            // Restaura o botão
            downloadBtn.innerHTML = originalContent;
            downloadBtn.disabled = false;

        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            alert('Erro ao gerar PDF. Tente novamente.');

            // Restaura o botão em caso de erro
            const downloadBtn = document.getElementById('download-pdf');
            downloadBtn.innerHTML = '<i class="bi bi-download me-2"></i>Baixar PDF';
            downloadBtn.disabled = false;
        }
    }

});
