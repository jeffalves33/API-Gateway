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
                    showWarning('Sessão expirada. Redirecionando para login...');
                    setTimeout(() => window.location.href = '/login', 2000);
                    return;
                }
                const data = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
                throw new Error(data.message || `Erro ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (!data || !data.user) throw new Error('Dados do usuário não encontrados');

            // Atualizar elementos da interface com verificação de existência
            if (userNameElement) userNameElement.textContent = data.user.name || 'Usuário';
            if (userCompletNameForm) userCompletNameForm.value = data.user.name || '';
            if (userEmailForm) userEmailForm.value = data.user.email || '';

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
            showError('Erro ao carregar perfil', error);
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
                showError('Nome deve ter pelo menos 2 caracteres');
                userCompletNameForm.focus();
                return;
            }

            if (!isValidEmail(email)) {
                showError('Por favor, insira um email válido');
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
                    if (!allowedTypes.includes(file.type)) throw new Error('Tipo de arquivo não permitido. Use apenas JPEG, PNG ou GIF.');

                    // Validar tamanho (5MB máximo)
                    if (file.size > 5 * 1024 * 1024) throw new Error('Arquivo muito grande. Tamanho máximo: 5MB.');

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
                        showError('Sessão expirada. Redirecionando para login...');
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

                showSuccess('Perfil atualizado com sucesso!');

            } catch (err) {
                showError('Erro ao atualizar perfil', err);
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
                showError(null, 'Não encontrado checkbox de desativação de conta');
                return;
            }

            if (!checkbox.checked) {
                showWarning('Confirme a desativação da sua conta marcando a caixa de seleção.');
                checkbox.focus();
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
                        showWarning('Sessão expirada. Redirecionando para login...');
                        setTimeout(() => window.location.href = '/login', 2000);
                        return;
                    }
                    const data = await response.json().catch(() => ({ message: 'Erro na exclusão' }));
                    throw new Error(data.message || 'Erro ao deletar conta');
                }

                // Limpar dados locais
                try {
                    localStorage.clear();
                    sessionStorage.clear();
                } catch (e) {
                    showError(null, `Erro ao limpar storage ${e}`);
                }

                // Redirecionar após um breve delay
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);

            } catch (err) {
                showError('Erro ao deletar conta', err);
                setLoading(false, deleteButton);
            }
        });
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
                showError(null, 'Elementos de upload de imagem não encontrados');
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
                            showWarning('Tipo de arquivo não permitido. Use apenas JPEG, PNG ou GIF.');
                            fileInput.value = '';
                            return;
                        }

                        if (file.size > 5 * 1024 * 1024) {
                            showWarning('Arquivo muito grande. Tamanho máximo: 5MB.');
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
                            showError('Erro ao carregar preview da imagem');
                        };
                    }
                } catch (error) {
                    showError('Erro no upload de imagem', error);
                }
            };
        } catch (error) {
            showError('Erro ao inicializar upload de imagem', error);
        }
    })();

    // Carregar perfil do usuário na inicialização
    await loadUserProfile();

    // Listener para erros não capturados
    window.addEventListener('unhandledrejection', (event) => {
        showError('Promise rejeitada não tratada', event.reason);
    });
});