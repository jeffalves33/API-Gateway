// Arquivo: controllers/externalKanbanController.js
const repo = require('../repositories/kanbanRepository');

const ok = (res, data) => res.status(200).json({ success: true, ...data });
const fail = (res, err) => res.status(400).json({ success: false, message: err.message || 'Erro' });

async function listCards(req, res) {
    try {
        const { token } = req.query;
        const data = await repo.listExternalCards(token);
        return ok(res, data);
    } catch (e) {
        return fail(res, e);
    }
}

async function getCard(req, res) {
    try {
        const { token } = req.query;
        const { card_id } = req.params;

        const data = await repo.externalGetCard(token, card_id);
        return ok(res, data);
    } catch (e) {
        return fail(res, e);
    }
}

async function approve(req, res) {
    try {
        const { token } = req.body;
        const { card_id } = req.params;
        const data = await repo.externalApprove(token, card_id);
        return ok(res, data);
    } catch (e) {
        return fail(res, e);
    }
}

async function requestChanges(req, res) {
    try {
        const { token, targets, text, body, message, author_name, author_email } = req.body || {};
        const note = String(text ?? "").trim();
        const { card_id } = req.params;

        const data = await repo.externalRequestChanges(token, card_id);

        if (note) {
            const profile = await repo.getClientProfileByToken(token);

            await repo.addComment(
                profile.id_user,
                card_id,
                "external",
                author_name || profile.approval_name || author_email || "Cliente",
                note
            );
        }
        return ok(res, data);
    } catch (e) {
        return fail(res, e);
    }
}

async function addComment(req, res) {
    try {
        const { token, body, author_name } = req.body;
        const { card_id } = req.params;

        const profile = await repo.getClientProfileByToken(token);
        const comment = await repo.addComment(
            profile.id_user,
            card_id,
            'external',
            author_name || profile.approval_name || 'Cliente',
            body
        );

        return ok(res, { comment });
    } catch (e) {
        return fail(res, e);
    }
}

async function listComments(req, res) {
    try {
        const { token } = req.query;
        const { card_id } = req.params;

        const profile = await repo.getClientProfileByToken(token);
        const comments = await repo.listComments(profile.id_user, card_id);

        return ok(res, { comments });
    } catch (e) {
        return fail(res, e);
    }
}

module.exports = { listCards, getCard, approve, requestChanges, addComment, listComments };
