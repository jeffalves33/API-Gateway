// Arquivo: assets/js/platformsPage.js
document.addEventListener('DOMContentLoaded', async function () {
    const userNameElement = document.getElementById('user-name');

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

    (async function () {
        try {
            const res = await fetch('/api/meta/status');
            const data = await res.json();

            if (data.facebookConnected) {
                const switches = document.querySelectorAll('.d-flex');

                switches.forEach(div => {
                    const title = div.querySelector('h6')?.textContent?.trim().toLowerCase();
                    const checkbox = div.querySelector('input[type="checkbox"]');

                    if (title === 'facebook' || title === 'instagram') {
                        checkbox.checked = true;
                    }
                });
            }

        } catch (error) {
            console.error('Erro ao verificar status do Facebook:', error);
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

            if (!e.target.checked) {
                // Impede desmarcar localmente
                e.target.checked = true;
                return;
            }

            if (label === 'facebook' || label === 'instagram') {
                window.location.href = '/api/meta/auth';
            }
        });
    });


    document.getElementById('log-out')?.addEventListener('click', logout);

    await loadUserProfile();

});
