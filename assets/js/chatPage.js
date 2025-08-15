document.addEventListener('DOMContentLoaded', async function () {
    const customerListElement = document.getElementById('dropdown-customer-list');
    const selectedCustomerNameElement = document.getElementById('selected-customer-name');
    const userNameElement = document.getElementById('user-name');
    const sendButton = document.querySelector('.send-btn');
    const chatInputField = document.querySelector('.chat-input-field');
    const chatMessagesContainer = document.querySelector('.chat-messages');
    const userProfileAvatarElements = document.querySelectorAll('.user-profile-avatar');

    let userId = null;
    let messageHistory = [];
    let isLoading = false;
    let currentLoadingMessage = null;

    // Função para mostrar erro
    function showError(message, isRetryable = false, retryCallback = null) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <i class="bi bi-exclamation-triangle-fill"></i>
            <span>${message}</span>
            ${isRetryable && retryCallback ? `<button class="retry-btn" onclick="(${retryCallback.toString()})()">Tentar novamente</button>` : ''}
        `;

        chatMessagesContainer.appendChild(errorDiv);
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;

        // Auto-remover erro após 5 segundos
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }

    // Função para validar dados
    function validateUserInput(message) {
        if (!message || message.trim().length === 0) {
            return { valid: false, error: 'Mensagem não pode estar vazia' };
        }
        if (message.length > 4000) {
            return { valid: false, error: 'Mensagem muito longa (máximo 4000 caracteres)' };
        }
        return { valid: true };
    }

    function validateCustomerSelection() {
        const customerId = localStorage.getItem("selectedCustomerId");
        if (!customerId) {
            return { valid: false, error: 'Selecione um cliente antes de enviar mensagens' };
        }
        return { valid: true };
    }

    // Função para mostrar loading no botão
    function setButtonLoading(loading) {
        if (loading) {
            sendButton.disabled = true;
            sendButton.innerHTML = '<div class="loading-spinner"></div>';
        } else {
            sendButton.disabled = false;
            sendButton.innerHTML = '<i class="bi bi-send-fill"></i>';
        }
    }

    // Função para mostrar loading message
    function showLoadingMessage() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'd-flex message ai-message message-loading';
        loadingDiv.innerHTML = `
            <div class="ai-avatar">
                <i class="bi bi-robot"></i>
            </div>
            <div class="message-content">
                <div class="message-text">
                    <div class="d-flex align-items-center">
                        <div class="loading-dots">
                            <div class="loading-dot"></div>
                            <div class="loading-dot"></div>
                            <div class="loading-dot"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        chatMessagesContainer.appendChild(loadingDiv);
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        return loadingDiv;
    }

    function updateSelectedCustomerDisplay(name) {
        if (selectedCustomerNameElement) {
            selectedCustomerNameElement.textContent = name || 'Cliente';
        }
    }

    function saveSelectedCustomer(id, name, facebookPageId) {
        try {
            localStorage.setItem('selectedCustomerId', id);
            localStorage.setItem('selectedCustomerName', name);
            localStorage.setItem('selectedCustomerFacebookPageId', facebookPageId || '');
        } catch (error) {
            console.error('Erro ao salvar dados no localStorage:', error);
            showError('Erro ao salvar seleção do cliente');
        }
    }

    function restoreSelectedCustomer() {
        try {
            const savedName = localStorage.getItem('selectedCustomerName');
            if (savedName) {
                updateSelectedCustomerDisplay(savedName);
            }
        } catch (error) {
            console.error('Erro ao restaurar cliente selecionado:', error);
        }
    }

    async function loadUserProfile() {
        try {
            const response = await fetch('/api/profile');

            if (!response.ok) {
                const data = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
                throw new Error(data.message || `Erro HTTP: ${response.status}`);
            }

            const data = await response.json();

            if (!data.user || !data.user.name || !data.user.id_user) {
                throw new Error('Dados do usuário inválidos');
            }

            if (userNameElement) {
                userNameElement.textContent = data.user.name;
            }
            userId = data.user.id_user;
            userProfileAvatarElements.forEach(element => {
                element.src = data.user.foto_perfil || defaultAvatar;
            });

        } catch (error) {
            console.error('Erro ao carregar perfil:', error);
            showError('Erro ao carregar perfil do usuário: ' + error.message);

            // Tentar novamente após 5 segundos
            setTimeout(() => {
                if (!userId) {
                    loadUserProfile();
                }
            }, 5000);
        }
    }

    async function loadCustomers() {
        try {
            const response = await fetch('/customer');

            if (!response.ok) {
                throw new Error(`Erro ao buscar clientes: ${response.status}`);
            }

            const data = await response.json();

            if (!data.customers || !Array.isArray(data.customers)) {
                throw new Error('Formato de dados inválido');
            }

            if (!customerListElement) {
                throw new Error('Elemento da lista de clientes não encontrado');
            }

            customerListElement.innerHTML = '';

            data.customers.forEach(customer => {
                if (!customer.id_customer || !customer.name) {
                    console.warn('Cliente com dados incompletos ignorado:', customer);
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
                                const data = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
                                throw new Error(data.message || 'Erro ao atualizar chaves');
                            }
                        }
                    } catch (error) {
                        console.error('Erro ao selecionar cliente:', error);
                        showError('Erro ao selecionar cliente: ' + error.message);
                    }
                });
            });
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
            showError('Erro ao carregar lista de clientes: ' + error.message, true, loadCustomers);
        }
    }

    async function logout() {
        try {
            const response = await fetch('/api/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
                throw new Error(data.message || 'Erro ao fazer logout');
            }

            localStorage.clear();
            window.location.href = '/';
        } catch (error) {
            console.error('Erro no logout:', error);
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

    // Função para auto-redimensionar o textarea
    function autoResize() {
        if (!chatInputField) return;

        try {
            // Reset height to auto to get the correct scrollHeight
            chatInputField.style.height = 'auto';

            // Calculate new height
            const newHeight = Math.min(chatInputField.scrollHeight, 200); // max-height: 200px
            const minHeight = 40; // min-height: 40px

            // Set the new height
            chatInputField.style.height = Math.max(newHeight, minHeight) + 'px';
        } catch (error) {
            console.error('Erro no auto-resize:', error);
        }
    }

    async function sendMessage() {
        if (isLoading) return;

        const userMessage = chatInputField.value.trim();

        // Validações
        const userValidation = validateUserInput(userMessage);
        if (!userValidation.valid) {
            showError(userValidation.error);
            return;
        }

        const customerValidation = validateCustomerSelection();
        if (!customerValidation.valid) {
            showError(customerValidation.error);
            return;
        }

        const customerId = localStorage.getItem("selectedCustomerId");
        const customerName = localStorage.getItem("selectedCustomerName");

        // Verificar se userId está disponível
        if (!userId) {
            showError('Dados do usuário não carregados. Recarregando...');
            await loadUserProfile();
            if (!userId) return;
        }

        isLoading = true;
        setButtonLoading(true);

        try {
            // Renderiza a mensagem do usuário no chat
            renderMessage('user', userMessage);

            // Adiciona a mensagem no histórico
            messageHistory.push({ role: 'user', content: userMessage });

            chatInputField.value = '';
            autoResize(); // Redimensiona após limpar o campo

            // Mostrar loading message
            currentLoadingMessage = showLoadingMessage();

            const response = await fetch('https://analyze-backend-5jyg.onrender.com/chat/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    customer_id: customerId,
                    customer_name: customerName,
                    client_id: userId,
                    prompt: userMessage,
                    history: messageHistory
                })
            });

            // Remover loading message
            if (currentLoadingMessage && currentLoadingMessage.parentNode) {
                currentLoadingMessage.remove();
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
                throw new Error(errorData.error || errorData.message || `Erro HTTP: ${response.status}`);
            }

            const data = await response.json();

            if (!data.response) {
                throw new Error('Resposta do assistente está vazia');
            }

            // Renderiza a resposta do assistente
            renderMessage('assistant', data.response);

            // Adiciona a resposta no histórico
            messageHistory.push({ role: 'assistant', content: data.response });

        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);

            // Remover loading message se ainda existir
            if (currentLoadingMessage && currentLoadingMessage.parentNode) {
                currentLoadingMessage.remove();
            }

            // Remover a última mensagem do usuário do histórico se houve erro
            if (messageHistory.length > 0 && messageHistory[messageHistory.length - 1].role === 'user') {
                messageHistory.pop();
            }

            const errorMsg = error.message.includes('Failed to fetch')
                ? 'Erro de conexão. Verifique sua internet e tente novamente.'
                : error.message;

            showError('❌ ' + errorMsg, true, () => {
                chatInputField.value = userMessage;
                sendMessage();
            });
        } finally {
            isLoading = false;
            setButtonLoading(false);
        }
    }

    function renderMessage(role, content) {
        if (!chatMessagesContainer) return;

        try {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('d-flex', 'message', role === 'user' ? 'user-message' : 'ai-message');

            const htmlContent = typeof marked !== 'undefined' && marked.parse
                ? marked.parse(content)
                : content.replace(/\n/g, '<br>');

            if (role === 'user') {
                messageDiv.innerHTML = `
                    <div class="user-avatar">
                        <i class="bi bi-person-fill"></i>
                    </div>
                    <div class="message-content">
                        <div class="message-text">
                            <p class="mb-0">${htmlContent}</p>
                        </div>
                    </div>
                `;
            } else {
                messageDiv.innerHTML = `
                    <div class="ai-avatar">
                        <i class="bi bi-robot"></i>
                    </div>
                    <div class="message-content">
                        <div class="message-text">
                            <p>${htmlContent}</p>
                        </div>
                    </div>
                `;
            }

            chatMessagesContainer.appendChild(messageDiv);

            // Rolagem automática para a última mensagem
            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        } catch (error) {
            console.error('Erro ao renderizar mensagem:', error);
        }
    }

    // Event listeners com tratamento de erro
    if (chatInputField) {
        chatInputField.addEventListener('input', autoResize);

        chatInputField.addEventListener('paste', function () {
            setTimeout(autoResize, 0);
        });

        chatInputField.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                // Enter sozinho: enviar mensagem
                e.preventDefault();
                if (!isLoading) {
                    sendMessage();
                }
            }
            // Shift+Enter: deixar o comportamento padrão (quebra de linha)
        });
    }

    // Event listeners para o botão de envio
    if (sendButton) {
        sendButton.addEventListener('click', function (e) {
            e.preventDefault();
            if (!isLoading) {
                sendMessage();
            }
        });
    }

    // Logout
    const logoutBtn = document.getElementById('log-out');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Tratamento de erros globais
    window.addEventListener('error', function (e) {
        console.error('Erro global capturado:', e.error);
    });

    window.addEventListener('unhandledrejection', function (e) {
        console.error('Promise rejection não tratada:', e.reason);
    });

    // Verificar conexão
    function checkConnection() {
        if (!navigator.onLine) {
            showError('Sem conexão com a internet');
        }
    }

    window.addEventListener('online', () => {
        console.log('Conexão restaurada');
    });

    window.addEventListener('offline', () => {
        showError('Conexão perdida. Verifique sua internet.');
    });

    // Verificar se elementos essenciais existem
    function validateElements() {
        const requiredElements = [
            { element: chatInputField, name: 'Campo de entrada do chat' },
            { element: sendButton, name: 'Botão de envio' },
            { element: chatMessagesContainer, name: 'Container de mensagens' }
        ];

        for (const { element, name } of requiredElements) {
            if (!element) {
                console.error(`Elemento essencial não encontrado: ${name}`);
                showError(`Erro de inicialização: ${name} não encontrado`);
                return false;
            }
        }
        return true;
    }

    // Inicialização com tratamento de erro
    try {
        if (!validateElements()) {
            throw new Error('Falha na validação de elementos');
        }

        checkConnection();
        restoreSelectedCustomer();

        await loadUserProfile();
        await loadCustomers();

        autoResize(); // Redimensionamento inicial

        console.log('Chat inicializado com sucesso');
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showError('Erro ao inicializar a página: ' + error.message);
    }
});