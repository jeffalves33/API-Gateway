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
                document.querySelector('input[role="switch"]').checked = true;
            }
        } catch (error) {
            console.error('Erro ao verificar status do Facebook:', error);
        }
    })();

    (function () {
        const plataformsConection = document.getElementById('plataforms-conection'),
            pagesConection = document.getElementById('pages-conection'),
            horizontalExample = document.getElementById('horizontal-example'),
            horizVertExample = document.getElementById('both-scrollbars-example');

        if (plataformsConection) {
            new PerfectScrollbar(plataformsConection, {
                wheelPropagation: false
            });
        }

        if (pagesConection) {
            new PerfectScrollbar(pagesConection, { wheelPropagation: false });
        }

        if (horizontalExample) {
            new PerfectScrollbar(horizontalExample, {
                wheelPropagation: false,
                suppressScrollY: true
            });
        }

        if (horizVertExample) {
            new PerfectScrollbar(horizVertExample, {
                wheelPropagation: false
            });
        }
    })();

    document.querySelectorAll('.form-check-input').forEach(input => {
        input.addEventListener('change', function (e) {
            if (e.target.checked) {
                window.location.href = '/api/meta/auth';
            }
        });
    });

    (async function () {
        try {
            const res = await fetch('/api/meta/pages');
            if (!res.ok) {
                const text = await res.text();
                console.error('Resposta bruta:', text);
                throw new Error('Erro ao buscar páginas');
            }

            const pages = await res.json();

            const pagesContainer = document.getElementById('pages-conection');
            if (pagesContainer) {
                pages.forEach(page => {
                    const isConnectedIcon = page.connected ? "bx bx-trash-alt" : "bx bx-link-alt";
                    const isConnectedButton = page.connected ? "btn-outline-danger connection-customer" : "btn-outline-secondary disconnected-customer";

                    const pageHtml = `
                            <div class="d-flex align-items-center mb-3">
                                <div class="flex-shrink-0 d-flex align-items-center justify-content-center me-3">
                                    <i class="bi bi-window-fullscreen fs-4"></i>
                                </div>
                                <div class="flex-grow-1 row">
                                    <div class="col-8 col-sm-7 mb-sm-0 mb-2">
                                        <h6 class="mb-0">${page.name}</h6>
                                        <small class="text-muted">${page.connected ? 'Conectado' : 'Desconectado'}</small>
                                    </div>
                                    <div class="col-4 col-sm-5 text-end">
                                        <button 
                                            type="button" 
                                            class="btn btn-icon ${isConnectedButton}" 
                                            data-id="${page.id}" 
                                            data-name="${page.name}"
                                            data-idPage="${page.id_page}"
                                            data-connected="${page.connected}">
                                            <i class="${isConnectedIcon}"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            `;

                    pagesContainer.insertAdjacentHTML('beforeend', pageHtml);
                });

                pagesContainer.addEventListener('click', async function (event) {
                    const botaoClicado = event.target.closest('button[data-id]');
                    if (!botaoClicado) return;

                    const idCustomer = botaoClicado.dataset.id;
                    const nome = botaoClicado.dataset.name;
                    const idPage = botaoClicado.dataset.idpage;
                    const connected = botaoClicado.dataset.connected === 'true';

                    if (connected) {
                        // fluxo para desconectar
                        try {
                            const res = await fetch(`/api/customers/facebook/${idCustomer}`, {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json' }
                            });

                            if (!res.ok) throw new Error('Erro ao desconectar cliente');

                            botaoClicado.classList.remove('btn-outline-danger');
                            botaoClicado.classList.add('btn-outline-secondary');
                            botaoClicado.dataset.connected = 'false';
                            botaoClicado.querySelector('i').className = 'bx bx-link-alt';
                            botaoClicado.closest('.d-flex').querySelector('small').textContent = 'Desconectado';

                            localStorage.clear();
                        } catch (error) {
                            console.error('Erro ao desconectar cliente:', error);
                        }
                    } else {
                        // fluxo para conectar
                        try {
                            const res = await fetch('/api/customers/facebook', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    id_customer: idCustomer,
                                    id_user: userId,
                                    id_page_facebook: idPage,
                                    name: nome
                                })
                            });

                            if (!res.ok) throw new Error('Erro ao conectar cliente');

                            botaoClicado.classList.remove('btn-outline-secondary');
                            botaoClicado.classList.add('btn-outline-danger');
                            botaoClicado.dataset.connected = 'true';
                            botaoClicado.querySelector('i').className = 'bx bx-trash-alt';
                            botaoClicado.closest('.d-flex').querySelector('small').textContent = 'Conectado';
                        } catch (error) {
                            console.error('Erro ao conectar cliente:', error);
                        }
                    }
                });
            }
        } catch (err) {
            console.error('Erro ao carregar páginas:', err);
        }
    })();

    document.getElementById('log-out')?.addEventListener('click', logout);

    await loadUserProfile();

});
