document.addEventListener("DOMContentLoaded", async () => {
    const modalElement = document.getElementById('modalToggle');
    const modal = new bootstrap.Modal(modalElement);
    const modalEditElement = document.getElementById('modalEditClient');
    const modalEdit = new bootstrap.Modal(modalEditElement);
    const tableBody = document.getElementById("clients-table-body");

    try {
        const response = await fetch("/customer");
        const clientes = await response.json();
        const badgeClasses = {
            "Conectado": "bg-label-success",         // Verde forte para indicar sucesso
            "Pendente": "bg-label-warning",          // Amarelo para algo aguardando
            "Não conferido": "bg-label-secondary",   // Cinza neutro para status incerto
            "Vazio": "bg-label-light",               // Claro, transmite "sem informação"
            "Erro": "bg-label-danger",               // Vermelho para falhas
            "Desconectado": "bg-label-dark",         // Preto para clientes inativos
            "Rejeitado": "bg-label-danger"           // Mesmo que erro, mas pode usar para OAuth falho
        };

        const platformIcons = {
            facebook: "facebook.png",
            instagram: "instagram.png",
            googleanalytics: "google-analytics.png",
            linkedin: "linkedin.png"
        };

        clientes.customers.forEach(cliente => {
            const row = document.createElement("tr");
            let platformsHTML = '';

            Object.entries(platformIcons).forEach(([platform, icon]) => {
                const tokenKeyMeta = `access_token_page_${platform}`;
                const tokenKeyGoogleAnalytics = `id_${platform}_property`;
                const tokenKeyLinkedin = `id_${platform}_organization`;

                if (cliente[tokenKeyMeta] || cliente[tokenKeyGoogleAnalytics] || cliente[tokenKeyLinkedin]) {
                    platformsHTML += `
                                <li data-bs-toggle="tooltip" title="${platform}" class="avatar avatar-xs pull-up">
                                    <img src="../assets/img/icons/brands/${icon}" alt="${platform}" class="rounded-circle" />
                                </li>
                            `;
                }
            });

            row.innerHTML = `
                        <td><span class="fw-medium">${cliente.name}</span></td>
                        <td>${cliente.email}</td>
                        <td>
                        <ul class="list-unstyled users-list m-0 avatar-group d-flex align-items-center">
                            ${platformsHTML}
                        </ul>
                        </td>
                        <td><span class="badge ${badgeClasses["Conectado"] || 'bg-label-secondary'} me-1">Conectado</span></td>
                        <td>
                        <div class="dropdown">
                            <button type="button" class="btn p-0 dropdown-toggle hide-arrow" data-bs-toggle="dropdown">
                            <i class="bx bx-dots-vertical-rounded"></i>
                            </button>
                            <div class="dropdown-menu">
                            <a class="dropdown-item edit_client" data-id="${cliente.id_customer}" href="#"><i class="bx bx-edit-alt me-1"></i> Editar</a>
                            <a class="dropdown-item remove-client" data-id="${cliente.id_customer}" href="#""><i class="bx bx-trash me-1"></i> Remover</a>
                            </div>
                        </div>
                        </td>
                    `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        showError("Erro ao buscar clientes", error);
    }

    // Função para configurar o modal de confirmação
    function setupConfirmationModal(id_customer) {
        const modalTitle = document.querySelector('#modalToggle .modal-title');
        const modalBody = document.querySelector('#modalToggle .modal-body');
        const modalButton = document.querySelector('#modalToggle .modal-footer .btn-danger');

        modalTitle.textContent = `Excluir Cliente`;
        modalBody.textContent = `Se excluir, todos os dados do cliente serão perdidos. Tem certeza?`;
        modalButton.textContent = 'Excluir';

        // Configurar o botão de confirmação para desconectar a plataforma
        modalButton.onclick = async function () {
            try {
                const response = await fetch(`/customer/delete/${id_customer}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.message || `Erro ao remover cliente!`);
                }

                modal.hide();
                location.reload();

                showSuccess('Removido com sucesso!');
            } catch (error) {
                showError('Erro ao excluir cliente', error);
            }
        };
    }

    document.addEventListener("click", async (event) => {
        if (event.target.closest(".remove-client")) {
            event.preventDefault();
            const id_customer = event.target.closest(".remove-client").getAttribute("data-id");

            setupConfirmationModal(id_customer);
            modal.show();
        }

        if (event.target.closest(".edit_client")) {
            event.preventDefault();
            const id_customer = event.target.closest(".edit_client").getAttribute("data-id");

            // Buscar dados do cliente
            try {
                const response = await fetch(`/customer/get/${id_customer}`);
                const cliente = await response.json();
                // Preencher o modal com os dados do cliente
                document.getElementById('editClientName').value = cliente.customer[0].name;
                document.getElementById('editClientEmail').value = cliente.customer[0].email;

                // Mostrar o modal
                modalEdit.show();

                // Configurar o botão de confirmação
                document.getElementById('confirmEditClient').onclick = async function () {
                    const updatedName = document.getElementById('editClientName').value;
                    const updatedEmail = document.getElementById('editClientEmail').value;

                    // Verificar se houve mudanças
                    if (updatedName === cliente.customer[0].name && updatedEmail === cliente.customer[0].email) {
                        modalEdit.hide();

                        // Mostrar mensagem informativa
                        showWarning('Nenhuma alteração foi detectada.')
                        return;
                    }

                    try {
                        const updateResponse = await fetch(`/customer/edit/${id_customer}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                name: updatedName,
                                email: updatedEmail
                            })
                        });

                        if (!updateResponse.ok) {
                            const data = await updateResponse.json();
                            throw new Error(data.message || 'Erro ao atualizar cliente!');
                        }

                        modalEdit.hide();
                        location.reload();

                        // Mostrar mensagem de sucesso
                        showSuccess('Cliente atualizado com sucesso!')
                    } catch (error) {
                        showError('Erro ao atualizar cliente', error);
                    }
                };
            } catch (error) {
                showError('Erro ao buscar dados do cliente', error);
            }
        }
    });
});