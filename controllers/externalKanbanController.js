const repo = require('../repositories/kanbanRepository');

const ok = (res, data) => res.status(200).json({ success: true, ...data });
const fail = (res, error) => res.status(400).json({ success: false, message: error?.message || 'Erro no portal do cliente.' });

async function listCards(req, res) {
  try {
    const token = String(req.query?.token || '').trim();
    return ok(res, await repo.listExternalCards(token));
  } catch (error) {
    console.error('externalKanbanController.listCards:', error);
    return fail(res, error);
  }
}

async function getCard(req, res) {
  try {
    const token = String(req.query?.token || '').trim();
    return ok(res, await repo.externalGetCard(token, req.params.card_id));
  } catch (error) {
    console.error('externalKanbanController.getCard:', error);
    return fail(res, error);
  }
}

async function addComment(req, res) {
  try {
    const token = String(req.body?.token || '').trim();
    const profile = await repo.getClientProfileByToken(token);
    const comment = await repo.addComment(profile.id_user, req.params.card_id, 'client', profile.client_name || 'Cliente', req.body?.body || req.body?.text || '', profile.id_account);
    return ok(res, { comment });
  } catch (error) {
    console.error('externalKanbanController.addComment:', error);
    return fail(res, error);
  }
}

async function listComments(req, res) {
  try {
    const token = String(req.query?.token || '').trim();
    const profile = await repo.getClientProfileByToken(token);
    const comments = await repo.listComments(profile.id_user, req.params.card_id, profile.id_account);
    return ok(res, { comments });
  } catch (error) {
    console.error('externalKanbanController.listComments:', error);
    return fail(res, error);
  }
}

module.exports = { listCards, getCard, addComment, listComments };
