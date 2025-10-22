// public/js/analyzesPage.js
document.addEventListener('DOMContentLoaded', async function () {
    const btnBuscarTexto = document.getElementById('btn-buscar-texto');
    const btnBuscarLoading = document.getElementById('btn-buscar-loading');
    const instructionMessage = document.getElementById('instruction-message');
    const contentDashboard = document.getElementById('content-dashboard');
    const customerListElement = document.getElementById('dropdown-customer-list');
    const selectedCustomerNameElement = document.getElementById('selected-customer-name');
    const userNameElement = document.getElementById('user-name');
    const loadingProgressElement = document.getElementById('loading-progress');
    const loadingTextElement = document.getElementById('loading-text');
    const loadingPercentageElement = document.getElementById('loading-percentage');
    const loadingBarElement = document.getElementById('loading-bar');
    const userProfileAvatarElements = document.querySelectorAll('.user-profile-avatar');

    let userId = null;
    const defaultAvatar = '/assets/img/avatars/default-avatar.png';

    // Habilita todos os tooltips do Bootstrap 5
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    [...tooltipTriggerList].forEach(el => new bootstrap.Tooltip(el));

    // ===== Helpers para novo payload =====
    function selectedPlatforms() {
        const ids = ['facebook', 'googleAnalytics', 'instagram', 'linkedin', 'youtube'];
        const map = {
            facebook: 'facebook',
            instagram: 'instagram',
            linkedin: 'linkedin',
            googleAnalytics: 'google_analytics',
            youtube: 'youtube'
        };
        return ids.filter(id => document.getElementById(id)?.checked)
            .map(id => map[id])
            .filter(Boolean);
    }

    // dd/mm/yyyy -> yyyy-mm-dd (ISO 8601, zero-padded)
    function toISO(brDate) {
        if (!brDate) return null;
        const [d, m, y] = brDate.split('/');
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    const TYPE_MAP = {
        descritiva: 'descriptive',
        preditiva: 'predictive',
        prescritiva: 'prescriptive',
        geral: 'general'
    };


    function showError(message, duration = 5000) {
        const alertContainer = document.getElementById('alert-container');
        if (alertContainer) {
            const alertId = 'alert-' + Date.now();
            alertContainer.innerHTML = `
            <div id="${alertId}" class="alert alert-danger alert-dismissible fade show position-fixed" 
                 style="top: 20px; right: 20px; z-index: 9999; min-width: 300px;" role="alert">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
            </div>`;

            // Auto-hide após duração especificada
            setTimeout(() => {
                const alert = document.getElementById(alertId);
                if (alert) {
                    alert.remove();
                }
            }, duration);
        }
    }

    function showSuccess(message, duration = 3000) {
        const alertContainer = document.getElementById('alert-container');
        if (alertContainer) {
            const alertId = 'alert-' + Date.now();
            alertContainer.innerHTML = `
            <div id="${alertId}" class="alert alert-success alert-dismissible fade show position-fixed" 
                 style="top: 20px; right: 20px; z-index: 9999; min-width: 300px;" role="alert">
                <i class="bi bi-check-circle-fill me-2"></i>${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
            </div>`;

            setTimeout(() => {
                const alert = document.getElementById(alertId);
                if (alert) {
                    alert.remove();
                }
            }, duration);
        }
    }

    function updateProgressBar(percentage, text) {
        if (loadingPercentageElement) loadingPercentageElement.textContent = `${percentage}%`;
        if (loadingTextElement) loadingTextElement.textContent = text;
        if (loadingBarElement) loadingBarElement.style.width = `${percentage}%`;
    }

    function showLoadingProgress() {
        if (loadingProgressElement) {

            loadingProgressElement.style.display = 'block';
            document.getElementById("form-busca").style.display = 'none';
            updateProgressBar(0, 'Preparando dados...');
        }
    }

    function hideLoadingProgress() {
        if (loadingProgressElement) {
            loadingProgressElement.style.display = 'none';
            document.getElementById("form-busca").style.display = 'block';
        }
    }

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
                const data = await response.json().catch(() => ({ message: 'Erro de comunicação com o servidor' }));
                throw new Error(data.message || `Erro ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();

            if (!data.user || !data.user.name) {
                throw new Error('Dados do usuário inválidos');
            }

            userNameElement.textContent = data.user.name;
            userId = data.user.id_user;
            userProfileAvatarElements.forEach(element => {
                element.src = data.user.foto_perfil || defaultAvatar;
            });

            if (!userId) {
                throw new Error('ID do usuário não encontrado');
            }
        } catch (error) {
            console.error('Erro ao carregar perfil:', error);
            showError(`Erro ao carregar perfil: ${error.message}`);
            // Redireciona para login se houver erro de autenticação
            if (error.message.includes('401') || error.message.includes('não autorizado')) {
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            }
        }
    }

    async function loadCustomers() {
        try {
            const response = await fetch('/customer');
            if (!response.ok) {
                throw new Error(`Erro ${response.status}: Falha ao buscar clientes`);
            }

            const responseData = await response.json();
            const customers = responseData.customers || [];

            customerListElement.innerHTML = '';

            if (customers.length === 0) {
                customerListElement.innerHTML = `
                    <li><span class="dropdown-item-text text-muted">Nenhum cliente encontrado</span></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="/platformsPage.html">Adicionar cliente</a></li>
                `;
                return;
            }

            customers.forEach(customer => {
                if (!customer.id_customer || !customer.name) {
                    console.warn('Cliente com dados inválidos:', customer);
                    return;
                }

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

            // Adicionar event listeners com tratamento de erro
            document.querySelectorAll('.dropdown-customer-list-items').forEach(item => {
                item.addEventListener('click', async function (e) {
                    e.preventDefault();

                    try {
                        const id = this.getAttribute('data-id');
                        const name = this.getAttribute('data-name');
                        const facebookPageId = this.getAttribute('data-facebook-page-id');

                        if (!id || !name) {
                            throw new Error('Dados do cliente inválidos');
                        }

                        saveSelectedCustomer(id, name, facebookPageId);
                        updateSelectedCustomerDisplay(name);

                        if (userId && id) {
                            const response = await fetch('/customer/cache', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id_user: userId, id_customer: id })
                            });

                            if (!response.ok) {
                                const data = await response.json().catch(() => ({ message: 'Erro de comunicação' }));
                                throw new Error(data.message || 'Erro ao atualizar cache de chaves');
                            }

                            showSuccess(`Cliente "${name}" selecionado com sucesso!`);
                        }
                    } catch (error) {
                        console.error('Erro ao selecionar cliente:', error);
                        showError(`Erro ao selecionar cliente: ${error.message}`);
                    }
                });
            });

        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
            showError(`Erro ao carregar clientes: ${error.message}`);

            // Fallback: mostrar apenas opção de adicionar cliente
            customerListElement.innerHTML = `
                <li><span class="dropdown-item-text text-danger">Erro ao carregar clientes</span></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item" href="/platformsPage.html">Adicionar cliente</a></li>
            `;
        }
    }

    async function logout() {
        try {
            const response = await fetch('/api/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({ message: 'Erro de comunicação' }));
                console.warn('Erro no logout:', data.message);
                // Mesmo com erro, limpa os dados locais e redireciona
            }

            // Sempre limpa o localStorage e redireciona, mesmo se houver erro no servidor
            localStorage.clear();
            showSuccess('Logout realizado com sucesso!');
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);

        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            // Mesmo com erro, força o logout local
            localStorage.clear();
            window.location.href = '/';
        }
    }

    document.getElementById('log-out')?.addEventListener('click', logout);

    restoreSelectedCustomer();
    await loadUserProfile();
    await loadCustomers();

    // Travar Decision Brief quando tipo = Descritiva
    (function initDecisionModeGuard() {
        const decisionMode = document.getElementById('decisionMode');
        const help = document.getElementById('decisionModeHelp');
        const radios = document.querySelectorAll('input[name="tipoAnalise"]');

        function syncDecisionMode() {
            const selected = document.querySelector('input[name="tipoAnalise"]:checked')?.id || 'descritiva';
            const isDesc = selected === 'descritiva';
            if (decisionMode) {
                if (isDesc) {
                    decisionMode.value = 'topicos';
                    decisionMode.setAttribute('disabled', 'disabled');
                    if (help) help.textContent = 'Em Descritiva, usamos “Tópicos” (Brief desativado).';
                } else {
                    decisionMode.removeAttribute('disabled');
                    if (help) help.textContent = 'Escolha o formato de entrega para tomada de decisão.';
                }
            }
        }
        radios.forEach(r => r.addEventListener('change', syncDecisionMode));
        syncDecisionMode();
    })();

    async function validateForm() {
        try {
            const startDate = document.getElementById('startDate')?.value;
            const endDate = document.getElementById('endDate')?.value;
            const facebook = document.getElementById('facebook')?.checked;
            const instagram = document.getElementById('instagram')?.checked;
            const googleAnalytics = document.getElementById('googleAnalytics')?.checked;
            const linkedin = document.getElementById('linkedin')?.checked;
            const tipoAnalise = document.querySelector('input[name="tipoAnalise"]:checked');
            const analysisFocus = document.querySelector('input[name="analysisFocus"]:checked');
            //const formatoRelatorio = document.getElementById('formatoRelatorio')?.value;

            if (!userId) throw new Error('Usuário não identificado. Faça login novamente.');
            if (!startDate || !endDate) throw new Error('Por favor, selecione a data inicial e final.');
            if (!analysisFocus) throw new Error('Selecione o ângulo da análise (Branding, Negócio, Conexão ou Panorama).');

            // Validar formato das datas
            const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
            if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) throw new Error('Formato de data inválido. Use DD/MM/AAAA.');

            // Validar se data inicial é anterior à final
            const [startDay, startMonth, startYear] = startDate.split('/').map(Number);
            const [endDay, endMonth, endYear] = endDate.split('/').map(Number);
            const startDateObj = new Date(startYear, startMonth - 1, startDay);
            const endDateObj = new Date(endYear, endMonth - 1, endDay);

            if (startDateObj > endDateObj) {
                throw new Error('A data inicial deve ser anterior à data final.');
            }

            // Validar se não é muito no futuro
            const today = new Date();
            if (endDateObj > today) throw new Error('A data final não pode ser no futuro.');
            if (!facebook && !instagram && !googleAnalytics && !linkedin) throw new Error('Por favor, selecione pelo menos uma plataforma.');
            if (!tipoAnalise) throw new Error('Por favor, selecione o tipo de análise.');
            //if (!formatoRelatorio || formatoRelatorio === 'Selecione' || formatoRelatorio === '') throw new Error('Por favor, selecione o formato do relatório.');

            const selectedCustomerId = localStorage.getItem('selectedCustomerId');
            if (!selectedCustomerId) throw new Error('Por favor, selecione um cliente.');

            return true;
        } catch (error) {
            showError(error.message);
            return false;
        }
    }

    document.getElementById('form-busca')?.addEventListener('submit', async function (e) {
        e.preventDefault();

        const id_customer = localStorage.getItem('selectedCustomerId');
        if (!id_customer) {
            showError('Nenhum cliente selecionado');
            return;
        }

        try {
            // Validar formulário
            const isValid = await validateForm();
            if (!isValid) return;

            // Mostrar barra de progresso e ocultar botão
            showLoadingProgress();
            btnBuscarTexto.classList.add('d-none');
            btnBuscarLoading.classList.remove('d-none');

            // Simular progresso enquanto prepara os dados
            updateProgressBar(10, 'Validando dados...');
            await new Promise(resolve => setTimeout(resolve, 500));

            setTimeout(function () {
                updateProgressBar(25, 'Coletando informações...');
            }, 500);

            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            const tipoAnalise = document.querySelector('input[name="tipoAnalise"]:checked').id;
            //const formatoRelatorio = document.getElementById('formatoRelatorio').value;

            // === NOVO BLOCO: coletar campos e montar payload completo ===
            const startDateVal = document.getElementById('startDate').value.trim();
            const endDateVal = document.getElementById('endDate').value.trim();

            // tipo de análise
            const selectedTypeId = document.querySelector('input[name="tipoAnalise"]:checked')?.id || 'descritiva';
            const analysisType = TYPE_MAP[selectedTypeId] || 'descriptive';

            // ângulo/enviesamento (se o HTML ainda não tiver, cai em 'panorama')
            const analysisFocus = document.querySelector('input[name="analysisFocus"]:checked')?.value || 'panorama';

            // plataformas (snake_case)
            const platforms = selectedPlatforms();

            // parâmetros de narrativa (se não existirem no HTML, defaults seguros)
            const voiceProfile = document.getElementById('voiceProfile')?.value || 'CMO';
            const narrativeStyle = document.getElementById('narrativeStyle')?.value || 'SCQA';
            //const granularity = document.getElementById('granularity')?.value || 'detalhada';
            //const bilingual = document.getElementById('bilingual')?.checked ?? true;

            // decision_mode: em Descritiva, força 'topicos'
            let decisionMode = document.getElementById('decisionMode')?.value || 'topicos';
            if (analysisType === 'descriptive') decisionMode = 'topicos';

            // pergunta opcional
            const analysisQuery = (document.getElementById('analysisQuery')?.value || '').trim() || null;

            // formato do relatório (seu select atual; use padrão 'detalhado' se não existir)
            //const outputFormat = document.getElementById('formatoRelatorio')?.value || 'detalhado';

            // payload final (novo contrato)
            const requestBody = {
                agency_id: String(userId),
                client_id: id_customer,
                platforms: platforms,
                analysis_type: analysisType,
                analysis_focus: analysisFocus,
                start_date: toISO(startDateVal),
                end_date: toISO(endDateVal),
                //output_format: outputFormat,
                analysis_query: analysisQuery,
                //bilingual: Boolean(bilingual),
                //granularity: granularity,
                voice_profile: voiceProfile,
                decision_mode: decisionMode,
                narrative_style: narrativeStyle
            };


            updateProgressBar(60, 'Enviando para análise...');

            const response = await fetch('https://analyze-backend-5jyg.onrender.com/analyze/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            console.log("response: ", response)

            updateProgressBar(80, 'Processando resposta...');

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Erro de comunicação com o servidor' }));
                throw new Error(errorData.message || `Erro ${response.status}: Falha ao gerar análise`);
            }

            const result = await response.json();

            if (!result || !result.result) {
                throw new Error('Resposta inválida do servidor');
            }

            updateProgressBar(95, 'Finalizando...');
            await new Promise(resolve => setTimeout(resolve, 500));

            updateProgressBar(100, 'Concluído!');

            // Ocultar mensagem de instrução e mostrar resultado
            if (instructionMessage) instructionMessage.style.display = 'none';
            if (contentDashboard) {
                renderAnalyzeResult(result);
                contentDashboard.style.display = 'block';
            }

            showSuccess('Análise gerada com sucesso!');

        } catch (error) {
            console.error('Erro ao gerar análise:', error);
            showError(`Erro ao gerar análise: ${error.message}`);
        } finally {
            // Sempre restaurar o estado original
            hideLoadingProgress();
            btnBuscarTexto.classList.remove('d-none');
            btnBuscarLoading.classList.add('d-none');
        }
    });

    function formatDateToISO(dateStr) {
        if (!dateStr) return null;
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
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
        const downloadBtn = document.getElementById('download-pdf');
        const originalContent = downloadBtn?.innerHTML;

        try {
            if (!window.jspdf) {
                throw new Error('Biblioteca de PDF não carregada. Recarregue a página e tente novamente.');
            }

            const { jsPDF } = window.jspdf;
            const element = document.getElementById('analysis-content');

            if (!element) {
                throw new Error('Conteúdo da análise não encontrado.');
            }

            if (!element.innerHTML.trim()) {
                throw new Error('Não há conteúdo para exportar.');
            }

            // Mostrar loading no botão
            if (downloadBtn) {
                downloadBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Gerando PDF...';
                downloadBtn.disabled = true;
            }

            // Verificar se html2canvas está disponível
            if (!window.html2canvas) {
                throw new Error('Biblioteca de captura não carregada. Recarregue a página e tente novamente.');
            }

            // Captura o elemento como imagem
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false
            });

            if (!canvas) {
                throw new Error('Falha ao capturar o conteúdo.');
            }

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
            const fileName = `Analise_${customerName.replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}.pdf`;

            // Faz o download
            pdf.save(fileName);
            showSuccess('PDF baixado com sucesso!');

        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            showError(`Erro ao gerar PDF: ${error.message}`);
        } finally {
            // Sempre restaurar o botão
            if (downloadBtn && originalContent) {
                downloadBtn.innerHTML = originalContent;
                downloadBtn.disabled = false;
            }
        }
    }
});
