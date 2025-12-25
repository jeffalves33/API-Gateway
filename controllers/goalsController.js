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
        const id_user = req.user.id;
        const { id_customer, platform_name, context = null } = req.body;

        if (!id_customer || !platform_name) {
            return res.status(400).json({ success: false, message: 'id_customer e platform_name são obrigatórios' });
        }

        const belongs = await checkCustomerBelongsToUser(Number(id_customer), id_user);
        if (!belongs) return res.status(403).json({ success: false, message: 'Cliente não pertence ao usuário.' });

        const pyRes = await fetch(`https://analyze-backend-5jyg.onrender.com/goals/suggestions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                agency_id: id_user,
                client_id: Number(id_customer),
                platform_name,
                context
            })
        });

        const pyData = await pyRes.json();
        if (!pyRes.ok || !pyData.success) {
            return res.status(500).json({ success: false, message: pyData.detail || 'Falha ao gerar sugestões (modelo).' });
        }

        return res.json({
            success: true,
            platform_name,
            suggestions: pyData.suggestions || []
        });
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

        // trava: só depois do período
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const end = new Date(`${goal.data_fim}T00:00:00`); end.setHours(0, 0, 0, 0);
        if (today <= end) {
            const br = end.toLocaleDateString('pt-BR');
            return res.status(400).json({
                success: false,
                message: `A análise só pode ser gerada após o fim do período (até ${br}).`
            });
        }

        const pyRes = await fetch(`https://analyze-backend-5jyg.onrender.com/goals/generate-analysis`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                agency_id: id_user,
                client_id: Number(goal.id_customer),
                goal_id: Number(goal.id_goal),
                platform_name: goal.platform_name,
                title: goal.title,
                descricao: goal.descricao,
                data_inicio: goal.data_inicio,
                data_fim: goal.data_fim,
                kpis: Array.isArray(goal.kpis) ? goal.kpis : [],
                metrics_summary: null
            })
        });

        const pyData = await pyRes.json();
        if (!pyRes.ok || !pyData.success) {
            return res.status(500).json({ success: false, message: pyData.detail || 'Falha ao gerar análise (modelo).' });
        }

        const updated = await goalsRepo.updateGoal({
            id_user,
            id_goal,
            patch: {
                status: 'concluido',
                analysis_text: pyData.analysis_text,
                analysis_generated_at: new Date().toISOString(),
                achieved: pyData.achieved,
                achieved_score: pyData.achieved_score
            }
        });

        return res.json({ success: true, goal: updated });
    } catch (err) {
        console.error('goals.generateAnalysis error:', err);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
};
