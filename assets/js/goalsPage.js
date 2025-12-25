// Arquivo: public/assets/js/goalsPage.js

// Catálogo básico de KPIs por plataforma (você pode expandir depois)
const KPI_CATALOG = {
  instagram: [
    { kpi: 'followers', label: 'Seguidores', unit: 'count' },
    { kpi: 'followers_per_week', label: 'Novos seguidores/semana', unit: 'count' },
    { kpi: 'engagement_rate', label: 'Taxa de engajamento', unit: 'percent' },
    { kpi: 'interactions_total', label: 'Interações totais', unit: 'count' },
    { kpi: 'reach', label: 'Alcance', unit: 'count' }
  ],
  facebook: [
    { kpi: 'followers', label: 'Seguidores', unit: 'count' },
    { kpi: 'reach', label: 'Alcance', unit: 'count' },
    { kpi: 'impressions', label: 'Impressões', unit: 'count' },
    { kpi: 'engagement_rate', label: 'Taxa de engajamento', unit: 'percent' }
  ],
  linkedin: [
    { kpi: 'followers', label: 'Seguidores', unit: 'count' },
    { kpi: 'posts_per_week', label: 'Posts por semana', unit: 'count' },
    { kpi: 'impressions', label: 'Impressões', unit: 'count' }
  ],
  ga4: [
    { kpi: 'sessions', label: 'Sessões', unit: 'count' },
    { kpi: 'conversion_rate', label: 'Taxa de conversão', unit: 'percent' }
  ]
};

function showAlert(message, type = 'danger') {
  const container = document.getElementById('alert-container');
  container.innerHTML = `
    <div class="alert alert-${type} alert-dismissible" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function loadCustomers() {
  const res = await fetch('/customer/', { method: 'GET' });
  const data = await res.json();

  if (!res.ok || !data.success) throw new Error(data.message || 'Erro ao carregar clientes');

  const selForm = document.getElementById('id_customer');
  const selFilter = document.getElementById('filter_customer');
  const selSuggest = document.getElementById('suggest_customer');

  selForm.innerHTML = `<option value="">Selecione...</option>`;
  selFilter.innerHTML = `<option value="">Todos</option>`;
  selSuggest.innerHTML = `<option value="">Selecione...</option>`;

  data.customers.forEach(c => {
    const name = c.name || `Cliente ${c.id_customer}`;

    const opt1 = document.createElement('option');
    opt1.value = c.id_customer;
    opt1.textContent = name;
    selForm.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = c.id_customer;
    opt2.textContent = name;
    selFilter.appendChild(opt2);

    const opt3 = document.createElement('option');
    opt3.value = c.id_customer;
    opt3.textContent = name;
    selSuggest.appendChild(opt3);
  });
}

function kpiRowTemplate(platform, preset = {}) {
  const items = KPI_CATALOG[platform] || [];
  const options = items.map(i => `
    <option value="${i.kpi}" ${preset.kpi === i.kpi ? 'selected' : ''}>
      ${i.label}
    </option>
  `).join('');

  const baseline = (preset.baseline ?? '') === null ? '' : (preset.baseline ?? '');
  const target = (preset.target ?? '') === null ? '' : (preset.target ?? '');

  return `
    <div class="card mb-2 kpi-row">
      <div class="card-body">
        <div class="row g-2 align-items-end">
          <div class="col-12 col-lg-5">
            <label class="form-label">KPI</label>
            <select class="form-select kpi-key">${options}</select>
          </div>

          <div class="col-6 col-lg-3">
            <label class="form-label">Baseline</label>
            <input class="form-control kpi-baseline" placeholder="auto" value="${baseline}" />
          </div>

          <div class="col-6 col-lg-3">
            <label class="form-label">Meta</label>
            <input class="form-control kpi-target" placeholder="Ex: 5500" value="${target}" />
          </div>

          <div class="col-12 col-lg-1 d-flex justify-content-end">
            <button type="button" class="btn btn-outline-danger btn-sm btn-remove-kpi">X</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderKpis(platform, kpis = []) {
  const container = document.getElementById('kpis-container');
  container.innerHTML = '';

  if (!kpis.length) {
    container.insertAdjacentHTML('beforeend', kpiRowTemplate(platform));
    return;
  }

  kpis.forEach(k => container.insertAdjacentHTML('beforeend', kpiRowTemplate(platform, k)));
}

function collectKpis(platform) {
  const rows = [...document.querySelectorAll('#kpis-container .kpi-row')];
  const catalog = KPI_CATALOG[platform] || [];

  const kpis = rows.map(row => {
    const kpiKey = row.querySelector('.kpi-key').value;
    const item = catalog.find(i => i.kpi === kpiKey);

    const baselineVal = row.querySelector('.kpi-baseline').value;
    const targetVal = row.querySelector('.kpi-target').value;

    return {
      kpi: kpiKey,
      label: item ? item.label : kpiKey,
      unit: item ? item.unit : null,
      baseline: baselineVal !== '' ? Number(baselineVal) : null,
      target: targetVal !== '' ? Number(targetVal) : null
    };
  }).filter(k => k.kpi && k.label);

  return kpis;
}

async function fetchGoals() {
  const id_customer = document.getElementById('filter_customer').value;
  const platform_name = document.getElementById('filter_platform').value;
  const status = document.getElementById('filter_status').value;

  const qs = new URLSearchParams();
  if (id_customer) qs.set('id_customer', id_customer);
  if (platform_name) qs.set('platform_name', platform_name);
  if (status) qs.set('status', status);

  const res = await fetch(`/api/goals?${qs.toString()}`, { method: 'GET' });
  const data = await res.json();

  if (!res.ok || !data.success) throw new Error(data.message || 'Erro ao carregar metas');
  return data.items;
}

function statusBadge(status) {
  if (status === 'ativo') return 'bg-label-primary';
  if (status === 'concluido') return 'bg-label-success';
  if (status === 'expirado') return 'bg-label-warning';
  if (status === 'cancelado') return 'bg-label-secondary';
  return 'bg-label-dark';
}

function parseAnyDate(dateStr) {
  if (!dateStr) return null;

  // Caso DATE "YYYY-MM-DD"
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr))) {
    return new Date(`${dateStr}T00:00:00`);
  }

  // Caso venha ISO com horário (timestamp)
  const d = new Date(dateStr);
  return isNaN(d) ? null : d;
}

function formatDateBR(dateStr) {
  const d = parseAnyDate(dateStr);
  if (!d) return '-';
  return d.toLocaleDateString('pt-BR');
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isGoalPeriodEnded(goal) {
  const end = parseAnyDate(goal.data_fim);
  if (!end) return false;

  // Só libera no dia seguinte ao data_fim (para não liberar "durante" o último dia)
  const today = startOfDay(new Date());
  const endDay = startOfDay(end);
  return today > endDay;
}

function daysRemaining(goal) {
  const end = parseAnyDate(goal.data_fim);
  if (!end) return null;

  const today = startOfDay(new Date());
  const endDay = startOfDay(end);
  const diff = Math.ceil((endDay - today) / 86400000);
  return diff;
}

function goalCard(goal) {
  const kpis = Array.isArray(goal.kpis) ? goal.kpis : [];
  const ended = isGoalPeriodEnded(goal);
  const remaining = daysRemaining(goal);
  const hasAnalysis = !!goal.analysis_text;

  const periodLabel = `${formatDateBR(goal.data_inicio)} — ${formatDateBR(goal.data_fim)}`;

  const remainingBadge = (!ended && remaining !== null)
    ? `<span class="badge bg-label-warning">Faltam ${remaining} dia(s)</span>`
    : ended
      ? `<span class="badge bg-label-secondary">Período encerrado</span>`
      : '';

  const kpisRows = kpis.slice(0, 6).map(k => {
    const base = (k.baseline ?? '—');
    const tgt = (k.target ?? '—');
    return `
      <tr>
        <td>${escapeHtml(k.label)}</td>
        <td class="text-end">${base}</td>
        <td class="text-end fw-medium">${tgt}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="col-12 col-lg-6">
      <div class="card">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <div>
              <h5 class="mb-1">${escapeHtml(goal.title)}</h5>

              <div class="goal-meta-line text-muted small">
                <span class="badge bg-label-primary">${escapeHtml(goal.platform_name)}</span>
                <span class="text-muted">${escapeHtml(goal.tipo_meta)}</span>
              </div>

              <div class="goal-meta-line mt-2">
                <span class="text-muted small">Período:</span>
                <span class="small fw-medium">${periodLabel}</span>
                ${remainingBadge}
              </div>
            </div>

            <span class="badge ${statusBadge(goal.status)}">${escapeHtml(goal.status)}</span>
          </div>

          <div class="mt-3">
            <div class="text-muted small fw-medium mb-1">Descrição SMART</div>
            <div class="small">${escapeHtml(goal.descricao)}</div>
          </div>

          <div class="mt-3">
            <div class="text-muted small fw-medium mb-2">KPIs</div>

            <div class="table-responsive">
              <table class="table table-sm mb-0 goal-card-kpis">
                <thead>
                  <tr>
                    <th>KPI</th>
                    <th class="text-end">Baseline</th>
                    <th class="text-end">Meta</th>
                  </tr>
                </thead>
                <tbody>
                  ${kpisRows || `<tr><td colspan="3" class="text-muted">Sem KPIs.</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>

          <div class="goal-actions mt-3">
            <button class="btn btn-sm btn-outline-primary" data-action="edit" data-id="${goal.id_goal}">
              Editar
            </button>

            <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${goal.id_goal}">
              Excluir
            </button>

            ${ended
      ? `<button class="btn btn-sm btn-outline-dark" data-action="generate-analysis" data-id="${goal.id_goal}">
                     Gerar análise do período
                   </button>`
      : ''
    }

            ${hasAnalysis
      ? `<button class="btn btn-sm btn-outline-success" data-action="view-analysis" data-id="${goal.id_goal}">
                     Ver análise
                   </button>`
      : ''
    }
          </div>
        </div>
      </div>
    </div>
  `;
}

async function renderGoals() {
  const grid = document.getElementById('goals-grid');
  grid.innerHTML = `<div class="col-12 text-muted">Carregando...</div>`;

  const items = await fetchGoals();

  if (!items.length) {
    grid.innerHTML = `<div class="col-12 text-muted">Nenhuma meta encontrada.</div>`;
    return;
  }

  grid.innerHTML = items.map(goalCard).join('');
}

function openGoalModalNew() {
  document.getElementById('goalModalTitle').textContent = 'Nova meta';
  document.getElementById('id_goal').value = '';
  document.getElementById('goal-form').reset();

  const defaultPlatform = 'instagram';
  document.getElementById('platform_name').value = defaultPlatform;
  renderKpis(defaultPlatform, []);

  new bootstrap.Modal(document.getElementById('modalGoal')).show();
}

async function openGoalModalEdit(id_goal) {
  const res = await fetch(`/api/goals/${id_goal}`, { method: 'GET' });
  const data = await res.json();

  if (!res.ok || !data.success) {
    showAlert(data.message || 'Erro ao carregar meta');
    return;
  }

  const goal = data.goal;

  document.getElementById('goalModalTitle').textContent = 'Editar meta';
  document.getElementById('id_goal').value = goal.id_goal;

  document.getElementById('id_customer').value = goal.id_customer;
  document.getElementById('platform_name').value = goal.platform_name;
  document.getElementById('tipo_meta').value = goal.tipo_meta;
  document.getElementById('title').value = goal.title;
  document.getElementById('descricao').value = goal.descricao;
  document.getElementById('data_inicio').value = goal.data_inicio;
  document.getElementById('data_fim').value = goal.data_fim;

  renderKpis(goal.platform_name, Array.isArray(goal.kpis) ? goal.kpis : []);

  new bootstrap.Modal(document.getElementById('modalGoal')).show();
}

async function saveGoal(e) {
  e.preventDefault();

  const id_goal = document.getElementById('id_goal').value;
  const platform_name = document.getElementById('platform_name').value;

  const payload = {
    id_customer: Number(document.getElementById('id_customer').value),
    platform_name,
    tipo_meta: document.getElementById('tipo_meta').value,
    title: document.getElementById('title').value,
    descricao: document.getElementById('descricao').value,
    data_inicio: document.getElementById('data_inicio').value,
    data_fim: document.getElementById('data_fim').value,
    kpis: collectKpis(platform_name),
    status: 'ativo'
  };

  if (!payload.id_customer) return showAlert('Selecione um cliente.');
  if (!payload.platform_name) return showAlert('Selecione a plataforma.');
  if (!payload.kpis.length) return showAlert('Adicione pelo menos 1 KPI válido.');

  const url = id_goal ? `/api/goals/${id_goal}` : `/api/goals`;
  const method = id_goal ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok || !data.success) return showAlert(data.message || 'Erro ao salvar meta');

  showAlert('Meta salva com sucesso!', 'success');
  bootstrap.Modal.getInstance(document.getElementById('modalGoal')).hide();
  await renderGoals();
}

async function deleteGoal(id_goal) {
  const res = await fetch(`/api/goals/${id_goal}`, { method: 'DELETE' });
  const data = await res.json();

  if (!res.ok || !data.success) return showAlert(data.message || 'Erro ao excluir meta');

  showAlert('Meta excluída!', 'success');
  await renderGoals();
}

async function generateAnalysis(id_goal) {
  const res = await fetch(`/api/goals/${id_goal}/actions/generate-analysis`, { method: 'POST' });
  const data = await res.json();

  if (!res.ok || !data.success) return showAlert(data.message || 'Erro ao gerar análise');

  showAlert('Análise gerada e salva na meta!', 'success');
  await renderGoals();
}

async function viewAnalysis(id_goal) {
  const res = await fetch(`/api/goals/${id_goal}`, { method: 'GET' });
  const data = await res.json();

  if (!res.ok || !data.success) return showAlert(data.message || 'Erro ao abrir análise');

  const goal = data.goal;

  document.getElementById('analysisModalTitle').textContent = `Análise — ${goal.title}`;
  document.getElementById('analysisModalText').textContent = goal.analysis_text || 'Sem análise ainda.';

  new bootstrap.Modal(document.getElementById('modalViewAnalysis')).show();
}

// ============ Sugestões ============
async function openSuggestionsModal() {
  document.getElementById('suggestions-list').innerHTML = '';
  new bootstrap.Modal(document.getElementById('modalSuggestions')).show();
}

async function loadSuggestions() {
  const id_customer = document.getElementById('suggest_customer').value;
  const platform_name = document.getElementById('suggest_platform').value;

  if (!id_customer) {
    showAlert('Selecione um cliente para gerar sugestões.');
    return;
  }

  const res = await fetch('/api/goals/actions/suggestions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_customer: Number(id_customer), platform_name })
  });

  const raw = await res.text();
  let data;
  try { data = JSON.parse(raw); }
  catch { data = { success: false, message: raw?.slice(0, 300) || 'Resposta não-JSON do servidor' }; }

  if (!res.ok || !data.success) return showAlert(data.message || data.detail || `Erro ao gerar sugestões (HTTP ${res.status})`);

  const container = document.getElementById('suggestions-list');

  if (!data.suggestions.length) {
    container.innerHTML = `<div class="text-muted">Sem sugestões para essa plataforma.</div>`;
    return;
  }

  container.innerHTML = data.suggestions.map((s, idx) => `
    <div class="card mb-2">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div class="fw-semibold">${escapeHtml(s.title)}</div>
          <span class="badge bg-label-primary">${escapeHtml(platform_name)}</span>
        </div>

        <div class="text-muted small mt-1">${escapeHtml(s.descricao)}</div>

        ${s.rationale ? `<div class="small mt-2"><span class="text-muted">Por quê:</span> ${escapeHtml(s.rationale)}</div>` : ''}

        <div class="small text-muted mt-2">
          KPIs: ${(s.kpis || []).map(k => escapeHtml(k.label)).join(', ')}
        </div>

        <button class="btn btn-sm btn-primary mt-2" data-use-suggestion="${idx}">
          Usar sugestão
        </button>
      </div>
    </div>
  `).join('');

  // ao clicar, preencher form e abrir modal de meta
  container.onclick = (e) => {
    const btn = e.target.closest('[data-use-suggestion]');
    if (!btn) return;

    const s = data.suggestions[Number(btn.getAttribute('data-use-suggestion'))];

    // fecha modal sugestões
    bootstrap.Modal.getInstance(document.getElementById('modalSuggestions')).hide();

    // abre modal meta e preenche
    document.getElementById('goalModalTitle').textContent = 'Nova meta (a partir de sugestão)';
    document.getElementById('id_goal').value = '';
    document.getElementById('goal-form').reset();

    document.getElementById('id_customer').value = id_customer;
    document.getElementById('platform_name').value = platform_name;
    document.getElementById('tipo_meta').value = s.tipo_meta;
    document.getElementById('title').value = s.title;
    document.getElementById('descricao').value = s.descricao;

    // KPIs predefinidos (baseline/target ficam pra você preencher)
    renderKpis(platform_name, (s.kpis || []).map(k => ({
      kpi: k.kpi,
      baseline: null,
      target: null
    })));

    new bootstrap.Modal(document.getElementById('modalGoal')).show();
  };
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadCustomers();
    await renderGoals();

    document.getElementById('btn-new-goal').addEventListener('click', openGoalModalNew);
    document.getElementById('btn-ai-suggest').addEventListener('click', openSuggestionsModal);
    document.getElementById('btn-load-suggestions').addEventListener('click', loadSuggestions);

    document.getElementById('goal-form').addEventListener('submit', saveGoal);

    document.getElementById('filter_customer').addEventListener('change', renderGoals);
    document.getElementById('filter_platform').addEventListener('change', renderGoals);
    document.getElementById('filter_status').addEventListener('change', renderGoals);

    document.getElementById('platform_name').addEventListener('change', (e) => {
      renderKpis(e.target.value || 'instagram', []);
    });

    document.getElementById('btn-add-kpi').addEventListener('click', () => {
      const platform = document.getElementById('platform_name').value || 'instagram';
      document.getElementById('kpis-container')
        .insertAdjacentHTML('beforeend', kpiRowTemplate(platform));
    });

    document.getElementById('kpis-container').addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-remove-kpi');
      if (!btn) return;
      btn.closest('.kpi-row').remove();
    });

    document.getElementById('goals-grid').addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;

      const action = btn.getAttribute('data-action');
      const id_goal = Number(btn.getAttribute('data-id'));

      if (action === 'edit') return openGoalModalEdit(id_goal);
      if (action === 'delete') return deleteGoal(id_goal);
      if (action === 'generate-analysis') return generateAnalysis(id_goal);
      if (action === 'view-analysis') return viewAnalysis(id_goal);
    });

  } catch (err) {
    console.error(err);
    showAlert(err.message || 'Falha ao inicializar');
  }
});
