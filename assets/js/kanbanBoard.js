(() => {
  const state = {
    board: null,
    columns: [],
    cards: [],
    labels: [],
    clients: [],
    team: [],
    selectedClientId: null,
    draggingCardId: null,
    draggingColumnId: null,
  };

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const cardModal = () => bootstrap.Modal.getOrCreateInstance($('#kbCardModal'));
  const columnModal = () => bootstrap.Modal.getOrCreateInstance($('#kbColumnModal'));

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      ...opts,
    });
    if (res.status === 204) return null;
    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok || data?.success === false) throw new Error(data?.message || `${res.status} ${res.statusText}`);
    return data;
  }

  function showFeedback(message, type = 'success') {
    const el = $('#kanban-feedback');
    el.className = `alert alert-${type}`;
    el.textContent = message;
    el.style.display = 'block';
    clearTimeout(showFeedback._timer);
    showFeedback._timer = setTimeout(() => { el.style.display = 'none'; }, 3000);
  }

  function fmtDate(value) {
    if (!value) return 'Sem prazo';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'Sem prazo';
    return d.toLocaleDateString('pt-BR');
  }

  function filters() {
    return {
      q: ($('#kb-search').value || '').trim().toLowerCase(),
      client: $('#kb-filter-client').value || 'all',
      member: $('#kb-filter-member').value || 'all',
      week: $('#kb-filter-week').value || 'all',
    };
  }

  function filteredCards() {
    const f = filters();
    return state.cards.filter((card) => {
      if (f.client !== 'all' && String(card.id_customer || '') !== f.client) return false;
      if (f.member !== 'all' && !(card.assignees || []).some((a) => String(a.id) === f.member)) return false;
      if (f.week !== 'all' && card.week !== f.week) return false;
      if (f.q) {
        const hay = [
          card.title,
          card.client_name,
          card.copy_text,
          ...(card.labels || []).map((l) => l.name),
          ...(card.assignees || []).map((a) => a.name),
        ].join(' ').toLowerCase();
        if (!hay.includes(f.q)) return false;
      }
      return true;
    });
  }

  function fillFiltersAndInputs() {
    const clientOptions = state.clients.map((c) => `<option value="${c.id_customer}">${escapeHtml(c.name)}</option>`).join('');
    const teamOptions = state.team.map((m) => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('');
    const roleOptions = `<option value="">Não definido</option>${state.team.map((m) => `<option value="${escapeHtml(m.name)}">${escapeHtml(m.name)}</option>`).join('')}`;

    $('#kb-filter-client').innerHTML = `<option value="all">Todos</option>${clientOptions}`;
    $('#kb-filter-member').innerHTML = `<option value="all">Todos</option>${teamOptions}`;
    $('#kb-card-client').innerHTML = `<option value="">Sem cliente</option>${clientOptions}`;
    $('#kb-card-column').innerHTML = state.columns.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');

    ['briefing', 'design', 'text', 'review', 'schedule'].forEach((key) => {
      const el = $(`#client-role-${key}`);
      if (el) el.innerHTML = roleOptions;
    });
  }

  function renderCard(card) {
    const labels = (card.labels || []).map((label) => `<span class="kb-label" style="background:${escapeHtml(label.color)}">${escapeHtml(label.name)}</span>`).join('');
    const assignees = (card.assignees || []).length
      ? card.assignees.map((a) => `<span class="kb-chip kb-chip-soft"><i class="bx bx-user"></i>${escapeHtml(a.name)}</span>`).join('')
      : '<span class="kb-chip kb-chip-soft"><i class="bx bx-user-x"></i>Sem responsável</span>';

    return `
      <div class="kb-card" draggable="true" data-card-id="${card.id}">
        <div class="d-flex justify-content-between gap-2 align-items-start">
          <div class="kb-card-title">${escapeHtml(card.title)}</div>
          <span class="kb-chip kb-chip-soft">${escapeHtml(card.week || 'S1')}</span>
        </div>
        <div class="kb-card-meta mb-2">${escapeHtml(card.client_name || 'Sem cliente')}</div>
        <div class="d-flex flex-wrap gap-2">${labels}</div>
        <div class="kb-card-footer">
          <div class="kb-assignees">${assignees}</div>
          <button class="btn btn-sm btn-outline-primary kb-open-card" data-id="${card.id}"><i class="bx bx-detail me-1"></i>Detalhes</button>
        </div>
        <div class="mt-2 small text-muted"><i class="bx bx-calendar me-1"></i>${escapeHtml(fmtDate(card.due_date))}</div>
      </div>`;
  }

  function renderBoard() {
    const board = $('#kb-board');
    const cards = filteredCards();
    board.innerHTML = '';

    state.columns
      .sort((a, b) => a.position - b.position)
      .forEach((column) => {
        const columnCards = cards.filter((c) => c.column_id === column.id).sort((a, b) => a.position - b.position);
        const wrap = document.createElement('div');
        wrap.className = 'kb-column';
        wrap.draggable = true;
        wrap.dataset.columnId = column.id;
        wrap.innerHTML = `
          <div class="kb-column-card">
            <div class="kb-column-head">
              <div class="kb-column-title">
                <span class="kb-column-dot" style="background:${escapeHtml(column.color || '#8592a3')}"></span>
                <span>${escapeHtml(column.name)}</span>
                <span class="badge bg-label-secondary rounded-pill">${columnCards.length}</span>
              </div>
              <div class="dropdown">
                <button class="btn btn-sm btn-icon btn-text-secondary" data-bs-toggle="dropdown"><i class="bx bx-dots-horizontal-rounded"></i></button>
                <ul class="dropdown-menu dropdown-menu-end">
                  <li><a class="dropdown-item kb-edit-column" href="#" data-id="${column.id}">Editar coluna</a></li>
                </ul>
              </div>
            </div>
            <div class="kb-dropzone" data-column-id="${column.id}">
              ${columnCards.length ? columnCards.map(renderCard).join('') : '<div class="kb-empty">Nenhum card nesta coluna</div>'}
            </div>
          </div>`;
        board.appendChild(wrap);
      });

    attachBoardEvents();
  }

  function renderLabelsTab() {
    $('#labels-list').innerHTML = state.labels.length ? state.labels.map((label) => `
      <div class="list-group-item d-flex align-items-center justify-content-between gap-3">
        <div class="d-flex align-items-center gap-2">
          <span class="kb-column-dot" style="background:${escapeHtml(label.color)}"></span>
          <strong>${escapeHtml(label.name)}</strong>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-secondary kb-edit-label" data-id="${label.id}">Editar</button>
          <button class="btn btn-sm btn-outline-danger kb-delete-label" data-id="${label.id}">Excluir</button>
        </div>
      </div>`).join('') : '<div class="text-muted">Nenhuma etiqueta cadastrada.</div>';

    $$('.kb-edit-label').forEach((btn) => {
      btn.onclick = () => {
        const label = state.labels.find((l) => l.id === btn.dataset.id);
        if (!label) return;
        $('#label-id').value = label.id;
        $('#label-name').value = label.name;
        $('#label-color').value = label.color;
      };
    });

    $$('.kb-delete-label').forEach((btn) => {
      btn.onclick = async () => {
        if (!window.confirm('Excluir esta etiqueta?')) return;
        try {
          await api(`/api/kanban/labels/${btn.dataset.id}`, { method: 'DELETE' });
          await refreshData();
          showFeedback('Etiqueta excluída com sucesso.');
        } catch (error) {
          showFeedback(error.message, 'danger');
        }
      };
    });
  }

  function renderClientsTab() {
    const selected = String(state.selectedClientId || '');
    $('#clients-list').innerHTML = state.clients.length ? state.clients.map((client) => `
      <button type="button" class="list-group-item list-group-item-action ${selected === String(client.id_customer) ? 'active' : ''}" data-client-id="${client.id_customer}">
        <div class="fw-semibold">${escapeHtml(client.name)}</div>
        <small>${client.client_profile_id ? 'Relação criada no Kanban' : 'Sem relação criada'}</small>
      </button>`).join('') : '<div class="text-muted">Nenhum cliente encontrado.</div>';

    $('#client-team-preview').innerHTML = state.team.length
      ? state.team.map((m) => `<span class="kb-chip kb-chip-soft"><i class="bx bx-user"></i>${escapeHtml(m.name)}</span>`).join('')
      : '<span class="text-muted">Nenhum membro ativo encontrado nesta conta.</span>';

    $$('#clients-list [data-client-id]').forEach((btn) => {
      btn.onclick = () => loadClientIntoForm(Number(btn.dataset.clientId));
    });
  }

  function loadClientIntoForm(clientId) {
    state.selectedClientId = clientId;
    const client = state.clients.find((c) => Number(c.id_customer) === Number(clientId));
    $('#client-id').value = client?.id_customer || '';
    $('#client-role-briefing').value = client?.roles?.briefing || '';
    $('#client-role-design').value = client?.roles?.design || '';
    $('#client-role-text').value = client?.roles?.text || '';
    $('#client-role-review').value = client?.roles?.review || '';
    $('#client-role-schedule').value = client?.roles?.schedule || '';
    $('#client-btn-delete').disabled = !client?.client_profile_id;
    $('#client-btn-copy-portal').disabled = !client;
    renderClientsTab();
  }

  function renderComments(comments) {
    return comments?.length ? comments.map((comment) => `
      <div class="kb-comment">
        <div class="d-flex justify-content-between gap-2 mb-1">
          <strong>${escapeHtml(comment.author || (comment.actor_type === 'client' ? 'Cliente' : 'Equipe'))}</strong>
          <small class="text-muted">${escapeHtml(new Date(comment.created_at).toLocaleString('pt-BR'))}</small>
        </div>
        <div>${escapeHtml(comment.text || comment.body || '')}</div>
      </div>`).join('') : '<div class="text-muted">Sem comentários externos.</div>';
  }

  function openCardModal(card = null, presetColumnId = null) {
    $('#kb-card-modal-title').textContent = card ? 'Editar card' : 'Novo card';
    $('#kb-card-id').value = card?.id || '';
    $('#kb-card-title').value = card?.title || '';
    $('#kb-card-week').value = card?.week || 'S1';
    $('#kb-card-client').value = card?.id_customer || '';
    $('#kb-card-due-date').value = card?.due_date ? String(card.due_date).slice(0, 10) : '';
    $('#kb-card-column').value = card?.column_id || presetColumnId || state.columns[0]?.id || '';
    $('#kb-card-copy').value = card?.copy_text || '';
    $('#kb-card-delete').classList.toggle('d-none', !card);

    $('#kb-card-assignees').innerHTML = state.team.length ? state.team.map((member) => {
      const checked = (card?.assignees || []).some((a) => Number(a.id) === Number(member.id)) ? 'checked' : '';
      return `<div class="form-check"><input class="form-check-input kb-card-assignee-input" type="checkbox" value="${member.id}" id="assignee-${member.id}" ${checked}><label class="form-check-label" for="assignee-${member.id}">${escapeHtml(member.name)}</label></div>`;
    }).join('') : '<div class="text-muted">Nenhum membro encontrado.</div>';

    $('#kb-card-labels').innerHTML = state.labels.length ? state.labels.map((label) => {
      const checked = (card?.labels || []).some((l) => l.id === label.id) ? 'checked' : '';
      return `<div class="form-check me-3"><input class="form-check-input kb-card-label-input" type="checkbox" value="${label.id}" id="label-${label.id}" ${checked}><label class="form-check-label" for="label-${label.id}"><span class="kb-label" style="background:${escapeHtml(label.color)}">${escapeHtml(label.name)}</span></label></div>`;
    }).join('') : '<div class="text-muted">Nenhuma etiqueta cadastrada.</div>';

    $('#kb-card-client-comments').innerHTML = renderComments(card?.client_comments || []);
    cardModal().show();
  }

  function openColumnModal(column = null) {
    $('#kb-column-id').value = column?.id || '';
    $('#kb-column-name').value = column?.name || '';
    $('#kb-column-color').value = column?.color || '#8592a3';
    $('#kb-column-delete').classList.toggle('d-none', !column);
    columnModal().show();
  }

  async function refreshData() {
    const data = await api('/api/kanban/board-data');
    state.board = data.board || null;
    state.columns = data.columns || [];
    state.cards = data.cards || [];
    state.labels = data.labels || [];
    state.clients = data.clients || [];
    state.team = data.team || [];
    fillFiltersAndInputs();
    renderBoard();
    renderLabelsTab();
    renderClientsTab();
    if (!state.selectedClientId && state.clients[0]) loadClientIntoForm(state.clients[0].id_customer);
  }

  function attachBoardEvents() {
    $$('.kb-open-card').forEach((btn) => {
      btn.onclick = async () => {
        const data = await api(`/api/kanban/cards/${btn.dataset.id}`);
        openCardModal(data.card);
      };
    });

    $$('.kb-edit-column').forEach((btn) => {
      btn.onclick = (event) => {
        event.preventDefault();
        const column = state.columns.find((c) => c.id === btn.dataset.id);
        openColumnModal(column || null);
      };
    });

    $$('.kb-card').forEach((cardEl) => {
      cardEl.addEventListener('dragstart', () => {
        state.draggingCardId = cardEl.dataset.cardId;
      });
      cardEl.addEventListener('dragend', () => {
        state.draggingCardId = null;
      });
    });

    $$('.kb-dropzone').forEach((zone) => {
      zone.addEventListener('dragover', (event) => {
        event.preventDefault();
        zone.classList.add('kb-over');
      });
      zone.addEventListener('dragleave', () => zone.classList.remove('kb-over'));
      zone.addEventListener('drop', async (event) => {
        event.preventDefault();
        zone.classList.remove('kb-over');
        if (!state.draggingCardId) return;
        const columnId = zone.dataset.columnId;
        const cardsInColumn = state.cards.filter((c) => c.column_id === columnId);
        try {
          await api(`/api/kanban/cards/${state.draggingCardId}/move`, {
            method: 'POST',
            body: JSON.stringify({ column_id: columnId, position: cardsInColumn.length + 1 }),
          });
          await refreshData();
        } catch (error) {
          showFeedback(error.message, 'danger');
        }
      });
    });

    $$('.kb-column').forEach((colEl) => {
      colEl.addEventListener('dragstart', () => { state.draggingColumnId = colEl.dataset.columnId; });
      colEl.addEventListener('dragover', (event) => event.preventDefault());
      colEl.addEventListener('drop', async () => {
        if (!state.draggingColumnId || state.draggingColumnId === colEl.dataset.columnId) return;
        const ids = state.columns.map((c) => c.id);
        const from = ids.indexOf(state.draggingColumnId);
        const to = ids.indexOf(colEl.dataset.columnId);
        if (from < 0 || to < 0) return;
        ids.splice(to, 0, ids.splice(from, 1)[0]);
        try {
          await api('/api/kanban/columns/reorder', { method: 'POST', body: JSON.stringify({ column_ids: ids }) });
          await refreshData();
        } catch (error) {
          showFeedback(error.message, 'danger');
        }
      });
      colEl.addEventListener('dragend', () => { state.draggingColumnId = null; });
    });
  }

  async function saveLabel() {
    const id = $('#label-id').value;
    const payload = { name: $('#label-name').value.trim(), color: $('#label-color').value };
    if (!payload.name) return showFeedback('Informe o nome da etiqueta.', 'warning');
    const method = id ? 'PUT' : 'POST';
    const path = id ? `/api/kanban/labels/${id}` : '/api/kanban/labels';
    await api(path, { method, body: JSON.stringify(payload) });
    $('#label-id').value = '';
    $('#label-name').value = '';
    $('#label-color').value = '#696cff';
    await refreshData();
    showFeedback('Etiqueta salva com sucesso.');
  }

  async function saveColumn() {
    const id = $('#kb-column-id').value;
    const payload = { name: $('#kb-column-name').value.trim(), color: $('#kb-column-color').value };
    if (!payload.name) return showFeedback('Informe o nome da coluna.', 'warning');
    const method = id ? 'PUT' : 'POST';
    const path = id ? `/api/kanban/columns/${id}` : '/api/kanban/columns';
    await api(path, { method, body: JSON.stringify(payload) });
    columnModal().hide();
    await refreshData();
    showFeedback('Coluna salva com sucesso.');
  }

  async function saveCard() {
    const id = $('#kb-card-id').value;
    const payload = {
      title: $('#kb-card-title').value.trim(),
      week: $('#kb-card-week').value,
      id_customer: $('#kb-card-client').value || null,
      due_date: $('#kb-card-due-date').value || null,
      column_id: $('#kb-card-column').value,
      copy_text: $('#kb-card-copy').value,
      assignee_ids: $$('.kb-card-assignee-input:checked').map((input) => Number(input.value)),
      label_ids: $$('.kb-card-label-input:checked').map((input) => input.value),
    };
    if (!payload.title) return showFeedback('Informe o título do card.', 'warning');
    const method = id ? 'PUT' : 'POST';
    const path = id ? `/api/kanban/cards/${id}` : '/api/kanban/cards';
    await api(path, { method, body: JSON.stringify(payload) });
    cardModal().hide();
    await refreshData();
    showFeedback('Card salvo com sucesso.');
  }

  async function saveClientProfile() {
    const idCustomer = $('#client-id').value;
    if (!idCustomer) return showFeedback('Selecione um cliente.', 'warning');
    const payload = {
      role_briefing_name: $('#client-role-briefing').value || null,
      role_design_name: $('#client-role-design').value || null,
      role_text_name: $('#client-role-text').value || null,
      role_review_name: $('#client-role-review').value || null,
      role_schedule_name: $('#client-role-schedule').value || null,
    };
    await api(`/api/kanban/clients/${idCustomer}/profile`, { method: 'PUT', body: JSON.stringify(payload) });
    await refreshData();
    loadClientIntoForm(Number(idCustomer));
    showFeedback('Relação do cliente salva com sucesso.');
  }

  function bindEvents() {
    $('#kb-search').addEventListener('input', renderBoard);
    $('#kb-filter-client').addEventListener('change', renderBoard);
    $('#kb-filter-member').addEventListener('change', renderBoard);
    $('#kb-filter-week').addEventListener('change', renderBoard);

    $('#btn-new-card').onclick = () => openCardModal();
    $('#btn-add-column').onclick = () => openColumnModal();
    $('#kb-card-save').onclick = () => saveCard().catch((error) => showFeedback(error.message, 'danger'));
    $('#kb-column-save').onclick = () => saveColumn().catch((error) => showFeedback(error.message, 'danger'));
    $('#label-btn-save').onclick = () => saveLabel().catch((error) => showFeedback(error.message, 'danger'));
    $('#label-btn-cancel').onclick = () => {
      $('#label-id').value = '';
      $('#label-name').value = '';
      $('#label-color').value = '#696cff';
    };

    $('#kb-card-delete').onclick = async () => {
      const id = $('#kb-card-id').value;
      if (!id || !window.confirm('Excluir este card?')) return;
      try {
        await api(`/api/kanban/cards/${id}`, { method: 'DELETE' });
        cardModal().hide();
        await refreshData();
        showFeedback('Card excluído com sucesso.');
      } catch (error) {
        showFeedback(error.message, 'danger');
      }
    };

    $('#kb-column-delete').onclick = async () => {
      const id = $('#kb-column-id').value;
      if (!id || !window.confirm('Excluir esta coluna?')) return;
      try {
        await api(`/api/kanban/columns/${id}`, { method: 'DELETE' });
        columnModal().hide();
        await refreshData();
        showFeedback('Coluna excluída com sucesso.');
      } catch (error) {
        showFeedback(error.message, 'danger');
      }
    };

    $('#client-btn-save').onclick = () => saveClientProfile().catch((error) => showFeedback(error.message, 'danger'));
    $('#client-btn-delete').onclick = async () => {
      const idCustomer = $('#client-id').value;
      if (!idCustomer || !window.confirm('Remover esta relação do Kanban?')) return;
      try {
        await api(`/api/kanban/clients/${idCustomer}/profile`, { method: 'DELETE' });
        await refreshData();
        loadClientIntoForm(Number(idCustomer));
        showFeedback('Relação removida com sucesso.');
      } catch (error) {
        showFeedback(error.message, 'danger');
      }
    };

    $('#client-btn-copy-portal').onclick = async () => {
      const idCustomer = $('#client-id').value;
      if (!idCustomer) return;
      try {
        const data = await api(`/api/kanban/clients/${idCustomer}/portal-link`);
        await navigator.clipboard.writeText(data.url);
        showFeedback('Link externo copiado.');
      } catch (error) {
        showFeedback(error.message, 'danger');
      }
    };

    $('#log-out')?.addEventListener('click', () => {
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      window.location.href = '/login.html';
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    bindEvents();
    try {
      await refreshData();
    } catch (error) {
      console.error(error);
      showFeedback(error.message, 'danger');
    }
  });
})();
