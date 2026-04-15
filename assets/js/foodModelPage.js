let userId = null;
const defaultAvatar = '/assets/img/avatars/default-avatar.png';

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

async function readPdfText(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const strings = content.items.map(item => item.str);
        // Junte o texto da página; use \n\n entre páginas para preservar alguma separação
        fullText += strings.join(' ') + '\n\n';
    }

    return fullText.trim();
}

// Função para capturar e validar o formulário
async function captureAndValidateForm() {
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

        const file = fileInput.files[0];
        const ext = file.name.split('.').pop().toLowerCase();

        if (ext === 'pdf') {
            const extractedText = await readPdfText(file);
            if (!extractedText || extractedText.length < 10) {
                throw new Error(
                    'Não conseguimos ler o conteúdo deste PDF. ' +
                    'Isso acontece quando o arquivo é apenas imagem (scan/arte). ' +
                    'Por favor, envie um PDF com texto ou um arquivo TXT/CSV.'
                );
            }
            document.getElementById('document-text').value = extractedText;

        } else if (ext === 'txt' || ext === 'csv') {
            // leitura simples como texto
            const text = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'));
                reader.readAsText(file, 'utf-8');
            });

            if (!text.trim()) {
                throw new Error('O arquivo está vazio ou não pôde ser lido.');
            }
            document.getElementById('document-text').value = text;

        } else {
            throw new Error('Tipo de arquivo não suportado. Use PDF, TXT ou CSV.');
        }
    }

    // Validar tags (pelo menos 5)
    const tags = document.getElementById('document-tags').value;
    const tagsRaw = (document.getElementById('document-tags').value || '').trim();
    let tagArray = '';
    if (tags.trim()) {
        tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
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
        documentAuthor: document.getElementById('document-author').value || '',
        documentSetor: document.getElementById('document-setor').value,
        documentTags: tagsRaw,
        uploadType: document.querySelector('input[name="upload-type"]:checked').value,
        agency_id: String(userId || ''),
        documentText: document.getElementById('document-text').value,
        client_id: String(selectedCustomerId),
        customerName: selectedCustomerName,
        mainCategory: descriptions[document.getElementById('doc-type').value] || '',
        subcategory: ''
    };

    // Adicionar conteúdo baseado no tipo de upload
    if (uploadType === 'text' || uploadType === 'pdf') {
        documentData.documentText = document.getElementById('document-text').value;
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

// ═══════════════════════════════════════════════════════════════════
// GERENCIAMENTO DE DOCUMENTOS — Pinecone
// ═══════════════════════════════════════════════════════════════════

const DOCS_API_BASE = 'https://analyze-backend-5jyg.onrender.com';

// Estado da aba de documentos
const docsState = {
    documents: [],
    selectedIds: new Set(),
    pendingDeleteId: null
};

// Rótulos amigáveis para tipos de documento
const docTypeLabels = {
    identidade: 'Identidade e posicionamento',
    estrategia: 'Estratégia e planejamento',
    comunicacao: 'Comunicação e marca',
    performance: 'Performance e dados',
    produtos: 'Produtos e serviços',
    vendas: 'Vendas e crescimento',
    operacao: 'Operação e tecnologia',
    suporte: 'Suporte e documentação',
    cases: 'Cases e referências'
};

// Rótulos de confidencialidade com badge
function confidentialityBadge(value) {
    const map = {
        baixa: ['success', 'Baixa'],
        media: ['warning', 'Média'],
        alta: ['danger', 'Alta']
    };
    const [color, label] = map[value] || ['secondary', value || '—'];
    return `<span class="badge bg-label-${color}">${label}</span>`;
}

// Formata data ISO para pt-BR
function formatDate(iso) {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
        return iso;
    }
}

// Mostra feedback na aba de documentos
function showDocsFeedback(message, type = 'info') {
    const el = document.getElementById('docs-feedback');
    el.className = `alert alert-${type}`;
    el.textContent = message;
    el.style.display = 'block';
    if (type === 'success') {
        setTimeout(() => { el.style.display = 'none'; }, 4000);
    }
}

// Atualiza o contador de selecionados e o botão de exclusão em lote
function updateBatchDeleteBtn() {
    const count = docsState.selectedIds.size;
    const btn = document.getElementById('btn-delete-batch');
    const span = document.getElementById('selected-count');
    span.textContent = count;
    if (count > 0) {
        btn.classList.remove('d-none');
        btn.disabled = false;
    } else {
        btn.classList.add('d-none');
        btn.disabled = true;
    }
    // Sincroniza o "check-all"
    const checkAll = document.getElementById('check-all-docs');
    if (checkAll) {
        checkAll.checked = docsState.documents.length > 0 && count === docsState.documents.length;
        checkAll.indeterminate = count > 0 && count < docsState.documents.length;
    }
}

// Renderiza a tabela de documentos
function renderDocumentsTable(documents) {
    const tbody = document.getElementById('documents-tbody');
    const countLabel = document.getElementById('docs-count-label');

    docsState.documents = documents;
    docsState.selectedIds.clear();
    updateBatchDeleteBtn();

    if (!documents || documents.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4">
                    <i class="bi bi-database-slash fs-4 d-block mb-2"></i>
                    Nenhum documento encontrado para os filtros selecionados.
                </td>
            </tr>`;
        countLabel.textContent = '0 documentos encontrados';
        return;
    }

    countLabel.textContent = `${documents.length} documento(s) encontrado(s)`;

    tbody.innerHTML = documents.map(doc => {
        const tags = Array.isArray(doc.tags)
            ? doc.tags.slice(0, 3).map(t => `<span class="badge bg-label-secondary me-1">${t}</span>`).join('')
            : '—';
        const moreTags = Array.isArray(doc.tags) && doc.tags.length > 3
            ? `<span class="text-muted small">+${doc.tags.length - 3}</span>` : '';

        return `
            <tr data-id="${doc.id}">
                <td>
                    <input class="form-check-input doc-checkbox" type="checkbox"
                        data-id="${doc.id}" value="${doc.id}">
                </td>
                <td>
                    <span class="fw-medium">${docTypeLabels[doc.doc_type] || doc.doc_type || '—'}</span>
                    <small class="d-block text-muted">${doc.scope || ''}</small>
                </td>
                <td>${doc.author || '—'}</td>
                <td>${doc.ctx_customer_name || doc.client_id || '—'}</td>
                <td>${confidentialityBadge(doc.confidentiality)}</td>
                <td>${tags}${moreTags}</td>
                <td class="text-nowrap">${formatDate(doc.created_at)}</td>
                <td>
                    <div class="d-flex gap-1">
                        <button class="btn btn-sm btn-outline-primary btn-view-details"
                            data-id="${doc.id}" title="Ver detalhes">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger btn-delete-single"
                            data-id="${doc.id}" title="Excluir">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
    }).join('');

    // Checkboxes individuais
    tbody.querySelectorAll('.doc-checkbox').forEach(cb => {
        cb.addEventListener('change', function () {
            if (this.checked) {
                docsState.selectedIds.add(this.value);
            } else {
                docsState.selectedIds.delete(this.value);
            }
            updateBatchDeleteBtn();
        });
    });

    // Botões "Ver detalhes"
    tbody.querySelectorAll('.btn-view-details').forEach(btn => {
        btn.addEventListener('click', function () {
            openDocumentDetails(this.dataset.id);
        });
    });

    // Botões "Excluir individual"
    tbody.querySelectorAll('.btn-delete-single').forEach(btn => {
        btn.addEventListener('click', function () {
            openDeleteConfirm(this.dataset.id);
        });
    });
}

// Carrega documentos da API
async function loadDocuments() {
    // userId é preenchido de forma assíncrona; aguarda até 3s se ainda for null
    if (!userId) {
        let waited = 0;
        await new Promise(resolve => {
            const poll = setInterval(() => {
                waited += 100;
                if (userId || waited >= 3000) {
                    clearInterval(poll);
                    resolve();
                }
            }, 100);
        });
    }

    const agencyId = String(userId || '');
    const clientId = localStorage.getItem('selectedCustomerId') || '';
    const scope = document.getElementById('filter-scope').value;
    const docType = document.getElementById('filter-doc-type').value;
    const limit = parseInt(document.getElementById('filter-limit').value, 10) || 50;

    if (!agencyId) {
        showDocsFeedback('Não foi possível identificar o usuário. Recarregue a página.', 'danger');
        return;
    }

    if (!clientId && scope === 'client') {
        showDocsFeedback('Selecione um cliente no menu superior antes de buscar.', 'warning');
        return;
    }

    const btn = document.getElementById('btn-load-documents');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Buscando...';
    document.getElementById('docs-feedback').style.display = 'none';

    const body = { agency_id: agencyId, scope, limit };
    if (docType) body.doc_type = docType;
    if (scope === 'client' && clientId) body.client_id = clientId;

    console.debug('[loadDocuments] body enviado:', JSON.stringify(body));

    try {
        const response = await fetch(`${DOCS_API_BASE}/documents/list`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || `Erro ${response.status}`);
        }

        const data = await response.json();
        console.debug('[loadDocuments] resposta recebida:', data.total, 'documentos');
        renderDocumentsTable(data.documents || []);

    } catch (error) {
        showDocsFeedback(`Erro ao carregar documentos: ${error.message}`, 'danger');
        renderDocumentsTable([]);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-search me-1"></i>Buscar';
    }
}

// Abre o modal de detalhes de um documento
async function openDocumentDetails(vectorId) {
    const modal = new bootstrap.Modal(document.getElementById('documentDetailsModal'));
    document.getElementById('details-loading').style.display = 'block';
    document.getElementById('details-content').style.display = 'none';
    modal.show();

    const agencyId = String(userId || '');
    const clientId = localStorage.getItem('selectedCustomerId') || '';
    const scope = document.getElementById('filter-scope').value;

    try {
        const body = { vector_id: vectorId, agency_id: agencyId, scope };
        if (clientId) body.client_id = clientId;

        const response = await fetch(`${DOCS_API_BASE}/documents/details`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || `Erro ${response.status}`);
        }

        const data = await response.json();
        const doc = data.document;

        // Preenche os campos do modal
        document.getElementById('det-doc-type').textContent = docTypeLabels[doc.doc_type] || doc.doc_type || '—';
        document.getElementById('det-author').textContent = doc.author || '—';
        document.getElementById('det-customer').textContent = doc.ctx_customer_name || doc.client_id || '—';
        document.getElementById('det-scope').textContent = doc.scope || '—';
        document.getElementById('det-confidentiality').innerHTML = confidentialityBadge(doc.confidentiality);
        document.getElementById('det-source').textContent = doc.source || '—';
        document.getElementById('det-main-category').textContent = doc.main_category || '—';
        document.getElementById('det-subcategory').textContent = doc.subcategory || '—';
        document.getElementById('det-created-at').textContent = formatDate(doc.created_at);
        document.getElementById('det-vector-id').textContent = doc.id || '—';
        document.getElementById('det-text').textContent = doc.text || '(sem conteúdo)';

        const tagsEl = document.getElementById('det-tags');
        if (Array.isArray(doc.tags) && doc.tags.length > 0) {
            tagsEl.innerHTML = doc.tags
                .map(t => `<span class="badge bg-label-secondary me-1 mb-1">${t}</span>`)
                .join('');
        } else {
            tagsEl.textContent = '—';
        }

        document.getElementById('details-loading').style.display = 'none';
        document.getElementById('details-content').style.display = 'block';

    } catch (error) {
        document.getElementById('details-loading').innerHTML =
            `<div class="alert alert-danger">Erro ao carregar detalhes: ${error.message}</div>`;
    }
}

// Abre modal de confirmação de exclusão individual
function openDeleteConfirm(vectorId) {
    docsState.pendingDeleteId = vectorId;
    document.getElementById('delete-doc-id-preview').textContent = `ID: ${vectorId}`;
    const modal = new bootstrap.Modal(document.getElementById('deleteDocModal'));
    modal.show();
}

// Executa exclusão individual
async function executeDeleteSingle() {
    const vectorId = docsState.pendingDeleteId;
    if (!vectorId) return;

    const agencyId = String(userId || '');
    const clientId = localStorage.getItem('selectedCustomerId') || '';
    const scope = document.getElementById('filter-scope').value;

    const btnConfirm = document.getElementById('btn-confirm-delete');
    btnConfirm.disabled = true;
    btnConfirm.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Excluindo...';

    try {
        const body = { vector_id: vectorId, agency_id: agencyId, scope };
        if (clientId) body.client_id = clientId;

        const response = await fetch(`${DOCS_API_BASE}/documents/delete`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || `Erro ${response.status}`);
        }

        bootstrap.Modal.getInstance(document.getElementById('deleteDocModal')).hide();
        showDocsFeedback('Documento excluído com sucesso.', 'success');

        // Remove da lista local
        docsState.documents = docsState.documents.filter(d => d.id !== vectorId);
        docsState.selectedIds.delete(vectorId);
        renderDocumentsTable(docsState.documents);

    } catch (error) {
        showDocsFeedback(`Erro ao excluir documento: ${error.message}`, 'danger');
        bootstrap.Modal.getInstance(document.getElementById('deleteDocModal'))?.hide();
    } finally {
        btnConfirm.disabled = false;
        btnConfirm.innerHTML = '<i class="bi bi-trash me-1"></i>Excluir';
        docsState.pendingDeleteId = null;
    }
}

// Executa exclusão em lote
async function executeDeleteBatch() {
    const vectorIds = Array.from(docsState.selectedIds);
    if (vectorIds.length === 0) return;

    const agencyId = String(userId || '');
    const clientId = localStorage.getItem('selectedCustomerId') || '';
    const scope = document.getElementById('filter-scope').value;

    const btnConfirm = document.getElementById('btn-confirm-delete-batch');
    btnConfirm.disabled = true;
    btnConfirm.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Excluindo...';

    try {
        const body = { vector_ids: vectorIds, agency_id: agencyId, scope };
        if (clientId) body.client_id = clientId;

        const response = await fetch(`${DOCS_API_BASE}/documents/delete/batch`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || `Erro ${response.status}`);
        }

        const result = await response.json();
        bootstrap.Modal.getInstance(document.getElementById('deleteBatchModal')).hide();
        showDocsFeedback(result.message || `${vectorIds.length} documento(s) excluído(s) com sucesso.`, 'success');

        // Remove da lista local
        docsState.documents = docsState.documents.filter(d => !docsState.selectedIds.has(d.id));
        docsState.selectedIds.clear();
        renderDocumentsTable(docsState.documents);

    } catch (error) {
        showDocsFeedback(`Erro ao excluir documentos: ${error.message}`, 'danger');
        bootstrap.Modal.getInstance(document.getElementById('deleteBatchModal'))?.hide();
    } finally {
        btnConfirm.disabled = false;
        btnConfirm.innerHTML = '<i class="bi bi-trash me-1"></i>Excluir todos selecionados';
    }
}

// ── Inicializa os event listeners da aba de documentos ──────────────
document.addEventListener('DOMContentLoaded', function () {

    // Botão buscar
    document.getElementById('btn-load-documents')?.addEventListener('click', loadDocuments);

    // Check-all
    document.getElementById('check-all-docs')?.addEventListener('change', function () {
        const checkboxes = document.querySelectorAll('.doc-checkbox');
        checkboxes.forEach(cb => {
            cb.checked = this.checked;
            if (this.checked) {
                docsState.selectedIds.add(cb.value);
            } else {
                docsState.selectedIds.delete(cb.value);
            }
        });
        updateBatchDeleteBtn();
    });

    // Botão excluir em lote (abre modal de confirmação)
    document.getElementById('btn-delete-batch')?.addEventListener('click', function () {
        const count = docsState.selectedIds.size;
        document.getElementById('batch-delete-count').textContent = count;
        new bootstrap.Modal(document.getElementById('deleteBatchModal')).show();
    });

    // Confirmar exclusão individual
    document.getElementById('btn-confirm-delete')?.addEventListener('click', executeDeleteSingle);

    // Confirmar exclusão em lote
    document.getElementById('btn-confirm-delete-batch')?.addEventListener('click', executeDeleteBatch);

    // Ao trocar para a aba de documentos, carrega automaticamente se houver cliente selecionado
    document.getElementById('tab-documents-btn')?.addEventListener('shown.bs.tab', function () {
        const clientId = localStorage.getItem('selectedCustomerId');
        if (clientId && docsState.documents.length === 0) {
            loadDocuments();
        }
    });
});

// ═══════════════════════════════════════════════════════════════════
// FIM — GERENCIAMENTO DE DOCUMENTOS
// ═══════════════════════════════════════════════════════════════════

// Event listener para submissão do formulário
document.getElementById('upload-document-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    const feedbackMessage = document.getElementById('feedback-message');

    try {
        const documentData = await captureAndValidateForm();

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
        feedbackMessage.textContent = 'Documento armazenado com sucesso!';
        feedbackMessage.style.display = 'block';

        // Limpar formulário após sucesso
        document.getElementById('upload-document-form').reset();
        document.getElementById('document-scope').dispatchEvent(new Event('change'));

        window.scrollTo(0, 0);

    } catch (error) {
        showError('Erro ao enviar documento', error);

        feedbackMessage.className = 'alert alert-danger';
        feedbackMessage.textContent = error.message;
        feedbackMessage.style.display = 'block';
        window.scrollTo(0, 0);
    }
});