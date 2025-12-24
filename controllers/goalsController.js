// Arquivo: controllers/goalsController.js
const goalsRepo = require('../repositories/goalsRepository');
const { checkCustomerBelongsToUser } = require('../repositories/customerRepository');

function requireFields(body, fields) {
    const missing = fields.filter(f => body[f] === undefined || body[f] === null || body[f] === '');
    return missing;
}

function isValidKpis(kpis) {
    return Array.isArray(kpis) && kpis.length > 0 && kpis.every(k => k.kpi && k.label);
}

// =============================
// CRUD
// =============================
exports.create = async (req, res) => {
    try {
        const id_user = req.user.id;

        const missing = requireFields(req.body, [
            'id_customer', 'platform_name', 'tipo_meta', 'title', 'descricao', 'data_inicio', 'data_fim'
        ]);
        if (missing.length) {
            return res.status(400).json({ success: false, message: `Campos obrigatórios: ${missing.join(', ')}` });
        }

        const belongs = await checkCustomerBelongsToUser(Number(req.body.id_customer), id_user);
        if (!belongs) return res.status(403).json({ success: false, message: 'Cliente não pertence ao usuário.' });

        const kpis = req.body.kpis ?? [];
        if (!isValidKpis(kpis)) {
            return res.status(400).json({ success: false, message: 'Informe pelo menos 1 KPI válido.' });
        }

        const created = await goalsRepo.createGoal({
            id_user,
            id_customer: Number(req.body.id_customer),
            platform_name: req.body.platform_name,
            tipo_meta: req.body.tipo_meta,
            title: req.body.title,
            descricao: req.body.descricao,
            data_inicio: req.body.data_inicio,
            data_fim: req.body.data_fim,
            kpis,
            status: req.body.status || 'ativo'
        });

        return res.status(201).json({ success: true, goal: created });
    } catch (err) {
        console.error('goals.create error:', err);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
};

exports.list = async (req, res) => {
    try {
        const id_user = req.user.id;
        await goalsRepo.expireEndedGoals(id_user);

        const items = await goalsRepo.listGoals({
            id_user,
            id_customer: req.query.id_customer || null,
            platform_name: req.query.platform_name || null,
            status: req.query.status || null
        });

        return res.json({ success: true, items });
    } catch (err) {
        console.error('goals.list error:', err);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
};

exports.get = async (req, res) => {
    try {
        const id_user = req.user.id;
        const id_goal = Number(req.params.id_goal);

        await goalsRepo.expireEndedGoals(id_user);

        const goal = await goalsRepo.getGoalById({ id_user, id_goal });
        if (!goal) return res.status(404).json({ success: false, message: 'Meta não encontrada' });

        return res.json({ success: true, goal });
    } catch (err) {
        console.error('goals.get error:', err);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
};

exports.update = async (req, res) => {
    try {
        const id_user = req.user.id;
        const id_goal = Number(req.params.id_goal);

        // opcional: se trocar id_customer, você pode validar de novo. (aqui não permito trocar)
        if (req.body.kpis !== undefined && !isValidKpis(req.body.kpis)) {
            return res.status(400).json({ success: false, message: 'KPIs inválidos.' });
        }

        const patch = {};
        const allow = ['platform_name', 'tipo_meta', 'title', 'descricao', 'data_inicio', 'data_fim', 'kpis', 'status'];
        for (const k of allow) {
            if (req.body[k] !== undefined) patch[k] = req.body[k];
        }

        const updated = await goalsRepo.updateGoal({ id_user, id_goal, patch });
        if (!updated) return res.status(404).json({ success: false, message: 'Meta não encontrada' });

        return res.json({ success: true, goal: updated });
    } catch (err) {
        console.error('goals.update error:', err);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
};

exports.remove = async (req, res) => {
    try {
        const id_user = req.user.id;
        const id_goal = Number(req.params.id_goal);

        const deleted = await goalsRepo.deleteGoal({ id_user, id_goal });
        if (!deleted) return res.status(404).json({ success: false, message: 'Meta não encontrada' });

        return res.json({ success: true });
    } catch (err) {
        console.error('goals.remove error:', err);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
};

// =============================
// Sugestões (templates SMART)
// =============================
exports.suggestions = async (req, res) => {
    try {
        const { id_customer, platform_name } = req.body;

        if (!id_customer || !platform_name) {
            return res.status(400).json({
                success: false,
                message: 'id_customer e platform_name são obrigatórios'
            });
        }

        // sugestões “prontas” (o usuário escolhe e preenche o form)
        // depois você pode trocar esse bloco por chamada real ao seu serviço de IA.
        const suggestionsByPlatform = {
            instagram: [
                {
                    tipo_meta: 'crescimento_seguidores',
                    title: 'Aumentar seguidores',
                    descricao: 'Aumentar em 10% o número de seguidores no período, mantendo consistência de publicações e otimizando horários.',
                    kpis: [
                        { kpi: 'followers', label: 'Seguidores', unit: 'count', baseline: null, target: null },
                        { kpi: 'followers_per_week', label: 'Novos seguidores/semana', unit: 'count', baseline: null, target: null }
                    ]
                },
                {
                    tipo_meta: 'aumento_engajamento',
                    title: 'Aumentar engajamento',
                    descricao: 'Elevar a taxa de engajamento em 2 p.p. no período, testando formatos (carrossel/reels) e CTAs.',
                    kpis: [
                        { kpi: 'engagement_rate', label: 'Taxa de engajamento', unit: 'percent', baseline: null, target: null },
                        { kpi: 'interactions_total', label: 'Interações totais', unit: 'count', baseline: null, target: null }
                    ]
                }
            ],
            facebook: [
                {
                    tipo_meta: 'aumento_alcance',
                    title: 'Aumentar alcance',
                    descricao: 'Aumentar o alcance em 15% no período com consistência e impulsionamentos pontuais em conteúdos-chave.',
                    kpis: [
                        { kpi: 'reach', label: 'Alcance', unit: 'count', baseline: null, target: null },
                        { kpi: 'impressions', label: 'Impressões', unit: 'count', baseline: null, target: null }
                    ]
                }
            ],
            linkedin: [
                {
                    tipo_meta: 'frequencia_postagem',
                    title: 'Melhorar consistência de publicações',
                    descricao: 'Publicar 3x por semana no período, garantindo 1 conteúdo educativo + 1 institucional + 1 case/resultado.',
                    kpis: [
                        { kpi: 'posts_per_week', label: 'Posts por semana', unit: 'count', baseline: null, target: null },
                        { kpi: 'impressions', label: 'Impressões', unit: 'count', baseline: null, target: null }
                    ]
                }
            ],
            ga4: [
                {
                    tipo_meta: 'trafego_leads',
                    title: 'Aumentar sessões qualificadas',
                    descricao: 'Aumentar em 20% as sessões no período, priorizando canais com maior intenção e ajustando campanhas.',
                    kpis: [
                        { kpi: 'sessions', label: 'Sessões', unit: 'count', baseline: null, target: null },
                        { kpi: 'conversion_rate', label: 'Taxa de conversão', unit: 'percent', baseline: null, target: null }
                    ]
                }
            ]
        };

        const suggestions = suggestionsByPlatform[platform_name] || [];
        return res.json({ success: true, platform_name, suggestions });
    } catch (err) {
        console.error('goals.suggestions error:', err);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
};

// =============================
// Gerar análise do período (salva TEXT na meta)
// =============================
exports.generateAnalysis = async (req, res) => {
    try {
        const id_user = req.user.id;
        const id_goal = Number(req.params.id_goal);

        const goal = await goalsRepo.getGoalById({ id_user, id_goal });
        if (!goal) return res.status(404).json({ success: false, message: 'Meta não encontrada' });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const end = new Date(`${goal.data_fim}T00:00:00`);
        end.setHours(0, 0, 0, 0);

        // Só libera no dia seguinte ao data_fim
        if (today <= end) {
            const br = new Date(`${goal.data_fim}T00:00:00`).toLocaleDateString('pt-BR');
            return res.status(400).json({
                success: false,
                message: `A análise só pode ser gerada após o fim do período (até ${br}).`
            });
        }

        // Placeholder: você vai substituir por cálculo real + IA
        // (ex: puxar métricas do período e avaliar targets dos KPIs)
        const startBR = new Date(`${goal.data_inicio}T00:00:00`).toLocaleDateString('pt-BR');
        const endBR = new Date(`${goal.data_fim}T00:00:00`).toLocaleDateString('pt-BR');

        const kpisLines = (Array.isArray(goal.kpis) ? goal.kpis : []).map(k => {
            const base = (k.baseline ?? '—');
            const tgt = (k.target ?? '—');
            return `- ${k.label}: baseline ${base} → meta ${tgt}`;
        }).join('\n');

        const analysisText =
            `Relatório de Encerramento da Meta

            Meta (OKR): ${goal.title}
            Plataforma: ${goal.platform_name}
            Período: ${startBR} a ${endBR}

            Descrição SMART
            ${goal.descricao}

            KPIs definidos
            ${kpisLines || '- (sem KPIs cadastrados)'}

            Resumo do período
            - (mocado) Houve evolução consistente nas métricas principais.
            - (mocado) Os melhores resultados vieram de consistência e ajustes de conteúdo.

            Conclusão
            - Atingiu a meta? (mocado) Parcial
            - Principais aprendizados:
            • (mocado) Conteúdos com CTA performaram melhor.
            • (mocado) Postagens em horários de pico aumentaram alcance.
            - Próximos passos:
            • (mocado) Manter cadência e aumentar ênfase em formatos vencedores.
        `;


        const updated = await goalsRepo.updateGoal({
            id_user,
            id_goal,
            patch: {
                status: 'concluido',
                analysis_text: analysisText,
                analysis_generated_at: new Date().toISOString(),
                // achieved: null,
                // achieved_score: null
            }
        });

        return res.json({ success: true, goal: updated });
    } catch (err) {
        console.error('goals.generateAnalysis error:', err);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
};
