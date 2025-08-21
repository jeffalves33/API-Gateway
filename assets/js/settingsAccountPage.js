// Arquivo: assets/js/settingsAccountPage.js
document.addEventListener('DOMContentLoaded', async function () {
    // Elementos do DOM
    const formDelet = document.getElementById('formAccountDeactivation');
    const form = document.getElementById('formAccountSettings');
    const userNameElement = document.getElementById('user-name');
    const userProfileAvatarElements = document.querySelectorAll('.user-profile-avatar');
    const userCompletNameForm = document.getElementById('completName');
    const userEmailForm = document.getElementById('email');
    const userProfilePicture = document.getElementById('uploadedAvatar');
    const logoutButton = document.getElementById('log-out');

    // Declarar essas variáveis no escopo principal para serem acessíveis
    let fileInput, avatarImg;
    let isSubmitting = false; // Prevenir múltiplos submits
    const defaultAvatar = '/assets/img/avatars/default-avatar.png';

    // Função para exibir alertas ao usuário
    function showAlert(message, type = 'danger', duration = 5000) {
        const alertContainer = document.getElementById('alert-container') || createAlertContainer();

        const alertId = 'alert-' + Date.now();
        const alertHtml = `
            <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
            </div>`;

        alertContainer.innerHTML = alertHtml;

        // Auto-remover após o tempo especificado
        if (duration > 0) {
            setTimeout(() => {
                const alertElement = document.getElementById(alertId);
                if (alertElement) {
                    alertElement.remove();
                }
            }, duration);
        }
    }

    // Criar container de alertas se não existir
    function createAlertContainer() {
        let container = document.getElementById('alert-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'alert-container';
            container.style.position = 'fixed';
            container.style.top = '20px';
            container.style.right = '20px';
            container.style.zIndex = '9999';
            container.style.maxWidth = '400px';
            document.body.appendChild(container);
        }
        return container;
    }

    // Função para validar email
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Função para validar nome
    function isValidName(name) {
        return name && name.trim().length >= 2;
    }

    // Função para mostrar/ocultar loading
    function setLoading(isLoading, buttonElement = null) {
        if (buttonElement) {
            if (isLoading) {
                buttonElement.disabled = true;
                buttonElement.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Carregando...';
            } else {
                buttonElement.disabled = false;
                buttonElement.innerHTML = buttonElement.getAttribute('data-original-text') || 'Salvar';
            }
        }
    }

    // Carregar perfil do usuário
    async function loadUserProfile() {
        try {
            const response = await fetch('/api/profile', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    showAlert('Sessão expirada. Redirecionando para login...', 'warning');
                    setTimeout(() => window.location.href = '/login', 2000);
                    return;
                }
                const data = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
                throw new Error(data.message || `Erro ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (!data || !data.user) {
                throw new Error('Dados do usuário não encontrados');
            }

            // Atualizar elementos da interface com verificação de existência
            if (userNameElement) {
                userNameElement.textContent = data.user.name || 'Usuário';
            }

            if (userCompletNameForm) {
                userCompletNameForm.value = data.user.name || '';
            }

            if (userEmailForm) {
                userEmailForm.value = data.user.email || '';
            }

            // Atualizar avatares com tratamento de erro de imagem
            const avatarUrl = data.user.foto_perfil || defaultAvatar;

            userProfileAvatarElements.forEach(element => {
                if (element) {
                    element.src = avatarUrl;
                    element.onerror = () => {
                        element.src = defaultAvatar;
                    };
                }
            });

            if (userProfilePicture) {
                userProfilePicture.src = avatarUrl;
                userProfilePicture.onerror = () => {
                    userProfilePicture.src = defaultAvatar;
                };
            }

        } catch (error) {
            console.error('Erro ao carregar perfil:', error);
            showAlert(`Erro ao carregar perfil: ${error.message}`, 'danger');
        }
    }

    // Manipulador do formulário de atualização
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (isSubmitting) {
                return;
            }

            // Validações do cliente
            const name = userCompletNameForm.value.trim();
            const email = userEmailForm.value.trim();

            if (!isValidName(name)) {
                showAlert('Nome deve ter pelo menos 2 caracteres', 'warning');
                userCompletNameForm.focus();
                return;
            }

            if (!isValidEmail(email)) {
                showAlert('Por favor, insira um email válido', 'warning');
                userEmailForm.focus();
                return;
            }

            const submitButton = form.querySelector('button[type="submit"]');
            if (submitButton && !submitButton.getAttribute('data-original-text')) {
                submitButton.setAttribute('data-original-text', submitButton.innerHTML);
            }

            try {
                isSubmitting = true;
                setLoading(true, submitButton);

                let fotoUrl = avatarImg ? avatarImg.src : defaultAvatar;

                // Upload da imagem se foi selecionada
                if (fileInput && fileInput.files && fileInput.files[0]) {
                    const file = fileInput.files[0];

                    // Validar tipo de arquivo
                    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
                    if (!allowedTypes.includes(file.type)) {
                        throw new Error('Tipo de arquivo não permitido. Use apenas JPEG, PNG ou GIF.');
                    }

                    // Validar tamanho (5MB máximo)
                    if (file.size > 5 * 1024 * 1024) {
                        throw new Error('Arquivo muito grande. Tamanho máximo: 5MB.');
                    }

                    const formData = new FormData();
                    formData.append('avatar', file);

                    const uploadResp = await fetch('/api/avatar', {
                        method: 'POST',
                        body: formData
                    });

                    if (!uploadResp.ok) {
                        const errorData = await uploadResp.json().catch(() => ({ message: 'Erro no upload' }));
                        throw new Error(errorData.message || 'Erro ao fazer upload da imagem');
                    }

                    const uploadData = await uploadResp.json();
                    fotoUrl = uploadData.url;
                }

                // Atualizar perfil
                const updateResp = await fetch('/api/update', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: name,
                        email: email,
                        foto_perfil: fotoUrl
                    })
                });

                if (!updateResp.ok) {
                    if (updateResp.status === 401) {
                        showAlert('Sessão expirada. Redirecionando para login...', 'warning');
                        setTimeout(() => window.location.href = '/login', 2000);
                        return;
                    }
                    const errorData = await updateResp.json().catch(() => ({ message: 'Erro na atualização' }));
                    throw new Error(errorData.message || 'Erro ao atualizar perfil');
                }

                const result = await updateResp.json();

                // Atualizar interface
                if (avatarImg && result.user.foto_perfil) {
                    avatarImg.src = result.user.foto_perfil;
                    avatarImg.onerror = () => {
                        avatarImg.src = defaultAvatar;
                    };
                }

                if (userNameElement && result.user.name) {
                    userNameElement.textContent = result.user.name;
                }

                // Atualizar todos os avatares
                userProfileAvatarElements.forEach(element => {
                    if (element && result.user.foto_perfil) {
                        element.src = result.user.foto_perfil;
                        element.onerror = () => {
                            element.src = defaultAvatar;
                        };
                    }
                });

                showAlert('Perfil atualizado com sucesso!', 'success');

            } catch (err) {
                console.error('Erro ao atualizar perfil:', err);
                showAlert(`Erro ao atualizar perfil: ${err.message}`, 'danger');
            } finally {
                isSubmitting = false;
                setLoading(false, submitButton);
            }
        });
    }

    // Manipulador do formulário de exclusão de conta
    if (formDelet) {
        formDelet.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Verificar se o checkbox existe e está marcado
            const checkbox = document.getElementById('accountActivation');
            if (!checkbox) {
                showAlert('Erro: Checkbox de confirmação não encontrado', 'danger');
                return;
            }

            if (!checkbox.checked) {
                showAlert('Por favor, confirme a desativação da sua conta marcando a caixa de seleção.', 'warning');
                checkbox.focus();
                return;
            }

            // Confirmar a ação
            if (!confirm('Tem certeza absoluta de que deseja deletar sua conta? Esta ação não pode ser desfeita.')) {
                return;
            }

            // Segunda confirmação para ações críticas
            if (!confirm('ÚLTIMA CONFIRMAÇÃO: Todos os seus dados serão perdidos permanentemente. Continuar?')) {
                return;
            }

            const deleteButton = formDelet.querySelector('button[type="submit"]');
            if (deleteButton && !deleteButton.getAttribute('data-original-text')) {
                deleteButton.setAttribute('data-original-text', deleteButton.innerHTML);
            }

            try {
                setLoading(true, deleteButton);

                const response = await fetch('/api/delete-account', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (!response.ok) {
                    if (response.status === 401) {
                        showAlert('Sessão expirada. Redirecionando para login...', 'warning');
                        setTimeout(() => window.location.href = '/login', 2000);
                        return;
                    }
                    const data = await response.json().catch(() => ({ message: 'Erro na exclusão' }));
                    throw new Error(data.message || 'Erro ao deletar conta');
                }

                showAlert('Conta deletada com sucesso! Redirecionando...', 'success');

                // Limpar dados locais
                try {
                    localStorage.clear();
                    sessionStorage.clear();
                } catch (e) {
                    console.warn('Erro ao limpar storage:', e);
                }

                // Redirecionar após um breve delay
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);

            } catch (err) {
                console.error('Erro ao deletar conta:', err);
                showAlert(`Erro ao deletar conta: ${err.message}`, 'danger');
                setLoading(false, deleteButton);
            }
        });
    }

    // Função de logout
    async function logout() {
        if (!confirm('Deseja realmente sair da sua conta?')) {
            return;
        }

        try {
            const response = await fetch('/api/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({ message: 'Erro no logout' }));
                throw new Error(data.message || 'Erro ao fazer logout');
            }

            showAlert('Logout realizado com sucesso!', 'success', 1000);

            // Limpar dados locais
            try {
                localStorage.clear();
                sessionStorage.clear();
            } catch (e) {
                console.warn('Erro ao limpar storage:', e);
            }

            setTimeout(() => {
                window.location.href = '/';
            }, 1000);

        } catch (error) {
            console.error('Erro no logout:', error);
            showAlert(`Erro ao sair: ${error.message}`, 'danger');
        }
    }

    // Event listener para logout
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }

    // Inicializar componentes de upload de imagem
    (function initializeImageUpload() {
        try {
            const accountUserImage = document.getElementById('uploadedAvatar');
            fileInput = document.querySelector('.account-file-input');

            if (!accountUserImage || !fileInput) {
                console.warn('Elementos de upload de imagem não encontrados');
                return;
            }

            // Definir avatarImg para ser usado no form submit
            avatarImg = accountUserImage;

            fileInput.onchange = () => {
                try {
                    if (fileInput.files && fileInput.files[0]) {
                        const file = fileInput.files[0];

                        // Validações básicas
                        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
                        if (!allowedTypes.includes(file.type)) {
                            showAlert('Tipo de arquivo não permitido. Use apenas JPEG, PNG ou GIF.', 'warning');
                            fileInput.value = '';
                            return;
                        }

                        if (file.size > 5 * 1024 * 1024) {
                            showAlert('Arquivo muito grande. Tamanho máximo: 5MB.', 'warning');
                            fileInput.value = '';
                            return;
                        }

                        // Preview da imagem
                        const objectUrl = window.URL.createObjectURL(file);
                        accountUserImage.src = objectUrl;

                        // Limpar URL object após carregar para evitar memory leaks
                        accountUserImage.onload = () => {
                            window.URL.revokeObjectURL(objectUrl);
                        };

                        accountUserImage.onerror = () => {
                            window.URL.revokeObjectURL(objectUrl);
                            accountUserImage.src = defaultAvatar;
                            showAlert('Erro ao carregar preview da imagem', 'warning');
                        };
                    }
                } catch (error) {
                    console.error('Erro no upload de imagem:', error);
                    showAlert('Erro ao processar imagem', 'danger');
                }
            };
        } catch (error) {
            console.error('Erro ao inicializar upload de imagem:', error);
        }
    })();

    // Carregar perfil do usuário na inicialização
    await loadUserProfile();

    // Listener para erros não capturados
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Promise rejeitada não tratada:', event.reason);
        showAlert('Ocorreu um erro inesperado. Tente novamente.', 'danger');
    });

    console.log('Página de configurações da conta inicializada com sucesso');
});