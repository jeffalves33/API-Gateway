// Arquivo: routes/kanbanRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken } = require('../middleware/authMiddleware');
const { uploadCardArts } = require('../middleware/uploadMiddleware');

const {
    // TEAM
    listTeam,
    addTeamMember,
    deleteTeamMember,

    // CLIENTS (customer + profile extra)
    listClientsWithProfile,
    upsertClientProfileByCustomerId,
    deleteClientProfileByCustomerId,
    getClientPortalLink,

    // CARDS
    listCards,
    createCard,
    updateCard,
    deleteCard,
    transitionCard,
    uploadCardAssets,
    addCardArts,
    uploadArts,
    deleteArt,

    // GOALS
    getGoalsByMonth,
    upsertGoalsByMonth,

    // EXTERNAL (cliente aprovador)
    externalListCards,
    externalGetCard,
    externalApproveCard,
    externalRequestChange,
    externalAddComment
} = require('../controllers/kanbanController');
const external = require('../controllers/externalKanbanController');

// =======================
// Upload (assets do card)
// =======================
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB por arquivo
});

// =======================
// INTERNAS (AUTH)
// =======================

// TEAM
router.get('/team', authenticateToken, listTeam);
router.post('/team', authenticateToken, addTeamMember);
router.delete('/team/:id', authenticateToken, deleteTeamMember);

// CLIENTS (lista customers do usuário + profile extra)
router.get('/clients', authenticateToken, listClientsWithProfile);
router.put('/clients/:id_customer/profile', authenticateToken, upsertClientProfileByCustomerId);
router.delete('/clients/:id_customer/profile', authenticateToken, deleteClientProfileByCustomerId);
router.get('/clients/:id_customer/portal-link', authenticateToken, getClientPortalLink);


// CARDS
router.get('/cards', authenticateToken, listCards);
router.post('/cards', authenticateToken, createCard);
router.put('/cards/:id', authenticateToken, updateCard);
router.delete('/cards/:id', authenticateToken, deleteCard);
router.post('/cards/:id/transition', authenticateToken, transitionCard);
router.post('/cards/:card_id/arts', authenticateToken, uploadCardArts.array('files', 10), uploadArts);
router.delete('/cards/:card_id/arts/:art_id', authenticateToken, deleteArt);

// ASSETS (multipart: files[])
router.post('/cards/:id/assets', authenticateToken, upload.array('files', 10), uploadCardAssets);

// GOALS
router.get('/goals', authenticateToken, getGoalsByMonth);        // ?month=YYYY-MM
router.put('/goals', authenticateToken, upsertGoalsByMonth);     // ?month=YYYY-MM

// =======================
// EXTERNAS (SEM AUTH)
// =======================
// tudo via token (query/header). controller valida.

router.get('/external/cards', external.listCards);                     // ?token=...
router.get('/external/cards/:card_id', external.getCard);
router.post('/external/cards/:card_id/approve', external.approve);     // body: { token }
router.post('/external/cards/:card_id/change', external.requestChanges);// body: { token, targets, body?, author_name? }
router.post('/external/cards/:card_id/comment', external.addComment);  // body: { token, body, author_name? }
router.get('/external/cards/:card_id/comments', external.listComments);// ?token=...
router.post('/external/cards/:card_id/request-changes', external.requestChanges);

module.exports = router;
