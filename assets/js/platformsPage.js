document.addEventListener('DOMContentLoaded', async function () {
    const userNameElement = document.getElementById('user-name');
    const modalElement = document.getElementById('modalToggle');
    const modal = new bootstrap.Modal(modalElement);
    let currentCheckbox = null;
    let userId = null;

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

    // Função para configurar o modal de confirmação
    function setupConfirmationModal(platform) {
        const modalTitle = document.querySelector('#modalToggle .modal-title');
        const modalBody = document.querySelector('#modalToggle .modal-body');
        const modalButton = document.querySelector('#modalToggle .modal-footer .btn-danger');

        modalTitle.textContent = `Desconectar ${platform}`;
        modalBody.textContent = `Se desconectar, todos seus dados de clientes conetados pelo ${platform} serão perdidos. Tem certeza?`;
        modalButton.textContent = 'Desconectar';

        // Configurar o botão de confirmação para desconectar a plataforma
        modalButton.onclick = async function () {
            try {
                const response = await fetch(`/customer/remove/${platform}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.message || `Erro ao desconectar ${platform}`);
                }

                // Se a desconexão foi bem-sucedida, desmarcar o checkbox
                if (currentCheckbox) {
                    currentCheckbox.checked = false;
                }

                // Fechar o modal
                modal.hide();

                // Mostrar mensagem de sucesso
                const alertContainer = document.getElementById('alert-container');
                if (alertContainer) {
                    alertContainer.innerHTML = `
                      <div class="alert alert-success alert-dismissible fade show" role="alert">
                        ${platform} desconectado com sucesso!
                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
                      </div>`;
                }
            } catch (error) {
                console.error(`Erro ao desconectar ${platform}:`, error);

                // Mostrar mensagem de erro
                const alertContainer = document.getElementById('alert-container');
                if (alertContainer) {
                    alertContainer.innerHTML = `
                      <div class="alert alert-danger alert-dismissible fade show" role="alert">
                        ${error.message}
                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
                      </div>`;
                }
            }
        };
    }

    (async function () {
        try {
            const resMeta = await fetch('/api/meta/status');
            const { facebookConnected, instagramConnected } = await resMeta.json();

            const resGoogleAnalytics = await fetch('/api/googleAnalytics/status');
            const { googleAnalyticsConnected } = await resGoogleAnalytics.json();

            const switches = document.querySelectorAll('.d-flex');

            switches.forEach(div => {
                const title = div.querySelector('h6')?.textContent?.trim().toLowerCase();
                const checkbox = div.querySelector('input[type="checkbox"]');

                if (title === 'facebook') {
                    checkbox.checked = facebookConnected;
                }

                if (title === 'instagram') {
                    checkbox.checked = instagramConnected;
                }

                if (title === 'google') {
                    checkbox.checked = googleAnalyticsConnected;
                }
            });

        } catch (error) {
            console.error('Erro ao verificar status do Facebook e Instagram:', error);
        }
    })();


    (function () {
        const plataformsConection = document.getElementById('plataforms-conection');

        if (plataformsConection) {
            new PerfectScrollbar(plataformsConection, {
                wheelPropagation: false
            });
        }
    })();

    document.querySelectorAll('.form-check-input').forEach(input => {
        input.addEventListener('change', function (e) {
            const label = input.closest('.d-flex').querySelector('h6')?.textContent?.trim().toLowerCase();

            if (label === 'facebook' || label === 'instagram' || label === 'google') {
                if (e.target.checked) {
                    if (label === 'google') {
                        window.location.href = '/api/googleAnalytics/auth';
                    } else {
                        window.location.href = '/api/meta/auth';
                    }
                } else {
                    e.preventDefault();
                    e.target.checked = true;

                    currentCheckbox = e.target;

                    setupConfirmationModal(label.charAt(0).toUpperCase() + label.slice(1));
                    modal.show();
                }
            }
        });
    });

    document.getElementById('log-out')?.addEventListener('click', logout);

    await loadUserProfile();
});