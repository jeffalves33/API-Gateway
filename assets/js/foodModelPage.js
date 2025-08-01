let userId = null;

const descriptions = {
    'identidade': "Informações sobre missão, valores, história e como a marca se posiciona no mercado.",
    'estrategia': "Metas da empresa, público-alvo, KPIs e análises estratégicas como SWOT e benchmarking.",
    'comunicacao': "Diretrizes de tom de voz, mensagens, canais, campanhas e estratégia de conteúdo.",
    'performance': "Métricas, funil de vendas, comportamento do cliente e comparativos de mercado.",
    'produtos': "Portfólio, precificação e estratégias de desenvolvimento de produtos e serviços.",
    'vendas': "Processos de vendas, metas comerciais e planos de crescimento.",
    'operacao': "Processos internos, ferramentas, automações e estrutura operacional.",
    'suporte': "Manuais, fluxos, procedimentos e materiais técnicos da empresa.",
    'cases': "Exemplos práticos, resultados anteriores e estudos de mercado."
};

document.addEventListener("DOMContentLoaded", async function () {
    const scopeSelect = document.getElementById("document-scope");
    const docTypeSelect = document.getElementById("doc-type");
    const docCategorization = document.getElementById("doc-type-categorization");
    const customerListElement = document.getElementById('dropdown-customer-list');
    const selectedCustomerNameElement = document.getElementById('selected-customer-name');
    const userNameElement = document.getElementById('user-name');
    const sendButton = document.querySelector('.send-btn');
    const chatInputField = document.querySelector('.chat-input-field');
    const chatMessagesContainer = document.querySelector('.chat-messages');
    const userProfileAvatarElements = document.querySelectorAll('.user-profile-avatar');

    let messageHistory = [];

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
            userProfileAvatarElements.forEach(element => {
                element.src = data.user.foto_perfil || defaultAvatar;
            });
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

    // Event listeners
    document.getElementById('log-out')?.addEventListener('click', logout);

    // Inicialização
    restoreSelectedCustomer();
    await loadUserProfile();
    await loadCustomers();

    // Configurações de tipos de documento
    /*const tiposCliente = [
        { value: "identidade", label: "Identidade e posicionamento" },
        { value: "estrategia", label: "Estratégia e planejamento" },
        { value: "comunicacao", label: "Comunicação e marca" },
        { value: "performance", label: "Performance e dados" },
        { value: "produtos", label: "Produtos e serviços" },
        { value: "vendas", label: "Vendas e crescimento" },
        { value: "operacao", label: "Operação e tecnologia" },
        { value: "suporte", label: "Suporte e documentação" },
        { value: "cases", label: "Cases e referências" }
    ];

    const tiposAgencia = [
        { value: "briefing", label: "Briefing de campanha" },
        { value: "midia", label: "Planejamento de mídia" },
        { value: "criacao", label: "Criação e design" },
        { value: "bi", label: "BI e dados" },
        { value: "documentacao", label: "Documentação interna" }
    ];

    // Event listener para mudança de escopo
    scopeSelect.addEventListener("change", () => {
        const escopo = scopeSelect.value;
        docTypeSelect.innerHTML = '<option value="">Selecione o tipo</option>';
        docCategorization.textContent = "";

        if (escopo === "client") {
            tiposCliente.forEach(tipo => {
                const option = new Option(tipo.label, tipo.value);
                docTypeSelect.add(option);
            });
        } else if (escopo === "agency") {
            tiposAgencia.forEach(tipo => {
                const option = new Option(tipo.label, tipo.value);
                docTypeSelect.add(option);
            });
        }
    });*/
});

// Função para capturar e validar o formulário
function captureAndValidateForm() {
    // Validação dos campos obrigatórios
    const requiredFields = [
        { id: 'document-scope', name: 'Escopo' },
        { id: 'doc-type', name: 'Tipo de Documento' },
        { id: 'confidentiality', name: 'Confidencialidade' },
        { id: 'document-setor', name: 'Setor' }
    ];
    const selectedCustomerId = localStorage.getItem('selectedCustomerId');
    if (!selectedCustomerId) {
        throw new Error('Selecione um cliente antes de enviar o documento');
    }

    for (const field of requiredFields) {
        const element = document.getElementById(field.id);
        if (!element.value.trim()) {
            throw new Error(`Campo obrigatório: ${field.name}`);
        }
    }

    // Validar tipo de upload e conteúdo
    const uploadType = document.querySelector('input[name="upload-type"]:checked').value;

    if (uploadType === 'text') {
        const textContent = document.getElementById('document-text').value;
        if (!textContent.trim()) {
            throw new Error('Conteúdo do documento é obrigatório');
        }
    } else if (uploadType === 'pdf') {
        const fileInput = document.getElementById('document-file');
        if (!fileInput.files || fileInput.files.length === 0) {
            throw new Error('Arquivo é obrigatório');
        }
    }

    // Validar tags (pelo menos 5)
    const tags = document.getElementById('document-tags').value;
    if (tags.trim()) {
        const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        if (tagArray.length < 5) {
            throw new Error('Insira pelo menos 5 tags separadas por vírgula');
        }
    }

    // Dados do cliente (se disponível)
    const selectedCustomerName = localStorage.getItem('selectedCustomerName');

    const documentData = {
        documentScope: document.getElementById('document-scope').value,
        docType: document.getElementById('doc-type').value,
        confidentiality: document.getElementById('confidentiality').value,
        documentAuthor: document.getElementById('document-author').value,
        documentSetor: document.getElementById('document-setor').value,
        documentTags: document.getElementById('document-tags').value,
        uploadType: uploadType,
        agency_id: userId.toString(),
        client_id: selectedCustomerId || '',
        customerName: selectedCustomerName || '',
        mainCategory: descriptions[document.getElementById('doc-type').value]
    };

    // Adicionar conteúdo baseado no tipo de upload
    if (uploadType === 'text') {
        documentData.documentText = document.getElementById('document-text').value;
    } else if (uploadType === 'pdf') {
        // Para PDF, você precisará implementar a extração de texto
        throw new Error('Upload de PDF ainda não implementado. Use texto por enquanto.');
    }

    return documentData;
}

// Event listener para mudança de tipo de documento
document.getElementById('doc-type').addEventListener('change', function () {
    const doc_type = this.value;
    const subtext = document.getElementById('doc-type-categorization');
    subtext.textContent = descriptions[doc_type] || "";
});

// Event listener para controle do tipo de upload
document.querySelectorAll('input[name="upload-type"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
        const textArea = document.getElementById('text-upload-area');
        const fileArea = document.getElementById('file-upload-area');

        if (this.value === 'text') {
            textArea.style.display = 'block';
            fileArea.style.display = 'none';
        } else {
            textArea.style.display = 'none';
            fileArea.style.display = 'block';
        }
    });
});

// Event listener para submissão do formulário
document.getElementById('upload-document-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    const feedbackMessage = document.getElementById('feedback-message');

    try {
        const documentData = captureAndValidateForm();
        console.log(documentData)

        // Mostrar loading
        feedbackMessage.className = 'alert alert-info';
        feedbackMessage.textContent = 'Enviando documento...';
        feedbackMessage.style.display = 'block';
        window.scrollTo(0, 0);

        // MODIFICAÇÃO: Enviar para sua API
        const response = await fetch('https://analyze-backend-5jyg.onrender.com/documents/store', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(documentData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Erro ao enviar documento');
        }

        const result = await response.json();

        // Sucesso
        feedbackMessage.className = 'alert alert-success';
        feedbackMessage.textContent = 'Documento armazenado com sucesso no banco vetorial!';
        feedbackMessage.style.display = 'block';

        // Limpar formulário após sucesso
        document.getElementById('upload-document-form').reset();
        document.getElementById('document-scope').dispatchEvent(new Event('change'));

        window.scrollTo(0, 0);

    } catch (error) {
        console.error('Erro ao enviar documento:', error);

        feedbackMessage.className = 'alert alert-danger';
        feedbackMessage.textContent = error.message;
        feedbackMessage.style.display = 'block';
        window.scrollTo(0, 0);
    }
});