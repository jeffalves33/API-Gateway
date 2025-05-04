document.addEventListener('DOMContentLoaded', async function () {
    const customerListElement = document.getElementById('dropdown-customer-list');
    const selectedCustomerNameElement = document.getElementById('selected-customer-name');
    const userNameElement = document.getElementById('user-name');
    const sendButton = document.querySelector('.send-btn');
    const chatInputField = document.querySelector('.chat-input-field');
    const chatMessagesContainer = document.querySelector('.chat-messages');

    let userId = null;
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
                       data-name="${customer.name}"
                       data-facebook-page-id="${customer.id_page_facebook || ''}">
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

    document.getElementById('log-out')?.addEventListener('click', logout);

    restoreSelectedCustomer();
    await loadUserProfile();
    await loadCustomers();

    async function sendMessage() {
        const userMessage = chatInputField.value.trim();
        if (!userMessage) return;

        // Renderiza a mensagem do usuário no chat
        renderMessage('user', userMessage);

        // Adiciona a mensagem no histórico
        messageHistory.push({ role: 'user', content: userMessage });

        chatInputField.value = '';

        try {
            //const response = await fetch('http://127.0.0.1:8000/chat/', {
            const response = await fetch('https://analyze-backend-uncs.onrender.com/chat/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: userId,
                    prompt: userMessage,
                    history: messageHistory
                })
            });

            if (!response.ok) {
                throw new Error('Erro ao enviar mensagem para o assistente');
            }

            const data = await response.json();

            // Renderiza a resposta do assistente
            renderMessage('assistant', data.response);

            // Adiciona a resposta no histórico
            messageHistory.push({ role: 'assistant', content: data.response });

        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            renderMessage('assistant', '❌ Erro ao obter resposta do assistente.');
        }
    }

    function renderMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('d-flex', 'message', role === 'user' ? 'user-message' : 'ai-message');

        if (role === 'user') {
            messageDiv.innerHTML = `
                <div class="user-avatar">
                    <i class="bi bi-person-fill"></i>
                </div>
                <div class="message-content">
                    <div class="message-text">
                        <p class="mb-0">${content}</p>
                    </div>
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="ai-avatar">
                    <i class="bi bi-robot"></i>
                </div>
                <div class="message-content">
                    <div class="ai-name">hoko AI</div>
                    <div class="message-text">
                        <p>${content}</p>
                    </div>
                    <div class="d-flex mt-3">
                        <button class="reaction-btn me-2">
                            <i class="bi bi-hand-thumbs-up"></i>
                        </button>
                        <button class="reaction-btn">
                            <i class="bi bi-hand-thumbs-down"></i>
                        </button>
                    </div>
                </div>
            `;
        }

        chatMessagesContainer.appendChild(messageDiv);

        // Rolagem automática para a última mensagem
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }

    sendButton.addEventListener('click', sendMessage);
    chatInputField.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    });
});
