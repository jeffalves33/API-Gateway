//assets/js/teamPage.js
async function loadMembers() {
    const res = await fetch('/api/team/members')
    const data = await res.json()

    const tbody = document.getElementById('teamMembersTable')
    tbody.innerHTML = ''

    data.members.forEach(member => {
        const tr = document.createElement('tr');

        const role = member.role || member.role_name || '-'; // depende do backend retornar
        const isAdmin = String(role).toLowerCase() === 'admin';

        // Se o backend retornar o id_user do membro, conseguimos impedir "desativar a si mesmo"
        const myUserId = window.__ME__?.user?.id; // vamos setar isso logo abaixo via /api/rbac/me
        const isSelf = myUserId && member.id_user && Number(member.id_user) === Number(myUserId);

        let actionHtml = '-';

        // Regras:
        // 1) nunca mostrar botão para Admin
        // 2) nunca mostrar botão para si mesmo
        // 3) só mostrar botão se status estiver active
        if (!isAdmin && !isSelf && member.status === 'active') {
            actionHtml = `
      <button
        class="btn btn-sm btn-danger"
        onclick="disableMember(${member.id_team_member})"
      >
        Desativar
      </button>
    `;
        }

        tr.innerHTML = `
    <td>${member.name || '-'}</td>
    <td>${member.email}</td>
    <td>${role}</td>
    <td>${member.status}</td>
    <td>${actionHtml}</td>
  `;

        tbody.appendChild(tr);
    });
}

async function loadInvites() {
    const res = await fetch('/api/team/invites')
    const data = await res.json()

    const tbody = document.getElementById('invitesTable')
    tbody.innerHTML = ''

    data.invites.forEach(invite => {
        const tr = document.createElement('tr')
        tr.innerHTML = `
            <td>${invite.email}</td>
            <td>${invite.expires_at}</td>
            <td>
            <button
            class="btn btn-sm btn-secondary"
            onclick="resendInvite(${invite.id_invite})"
            >
            Reenviar
            </button>
            <button
            class="btn btn-sm btn-danger"
            onclick="cancelInvite(${invite.id_invite})"
            >
            Cancelar
            </button>
            </td>
        `
        tbody.appendChild(tr)
    })
}

async function inviteMember() {
    const input = document.getElementById('inviteEmail');
    const email = input.value.trim();

    if (!email) {
        showError('Informe um email.');
        return;
    }

    try {
        const response = await fetch('/api/team/invites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        if (!response.ok) {
            if (response.status === 400) {
                showError('Email inválido ou não informado.');
                return;
            }

            if (response.status === 409) {
                showWarning('Email já cadastrado em outra conta.');
                return;
            }

            if (response.status === 410) {
                showWarning('Usuário já faz parte da equipe desta conta.');
                return;
            }

            showError('Erro desconhecido. Tente novamente mais tarde.');
            return;
        }

        // Sucesso
        showSuccess('Convite enviado com sucesso.');
        input.value = '';
        loadInvites();
    } catch (error) {
        console.error('Erro ao enviar convite:', error);
        showError('Erro de conexão ao enviar convite.');
    }
}

async function resendInvite(id) {
    await fetch(`/api/team/invites/${id}/resend`, {
        method: 'POST'
    })
    loadInvites()
}

async function cancelInvite(id) {
    await fetch(`/api/team/invites/${id}`, {
        method: 'DELETE'
    })
    loadInvites()
}

async function disableMember(id) {
    await fetch(`/api/team/members/${id}/disable`, {
        method: 'PATCH'
    })
    loadMembers()
}

document.getElementById('btnInvite').addEventListener('click', inviteMember)

loadMembers()
loadInvites()