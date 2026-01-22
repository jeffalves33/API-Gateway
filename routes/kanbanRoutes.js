// Arquivo: routes/kanbanRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken } = require('../middleware/authMiddleware');

const {
    // TEAM
    listTeam,
    addTeamMember,
    deleteTeamMember,

    // CLIENTS (customer + profile extra)
    listClientsWithProfile,
    upsertClientProfileByCustomerId,
    deleteClientProfileByCustomerId,

    // CARDS
    listCards,
    createCard,
    updateCard,
    deleteCard,
    transitionCard,
    uploadCardAssets,

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

// CARDS
router.get('/cards', authenticateToken, listCards);
router.post('/cards', authenticateToken, createCard);
router.put('/cards/:id', authenticateToken, updateCard);
router.delete('/cards/:id', authenticateToken, deleteCard);
router.post('/cards/:id/transition', authenticateToken, transitionCard);

// ASSETS (multipart: files[])
router.post(
    '/cards/:id/assets',
    authenticateToken,
    upload.array('files', 10),
    uploadCardAssets
);

// GOALS
router.get('/goals', authenticateToken, getGoalsByMonth);        // ?month=YYYY-MM
router.put('/goals', authenticateToken, upsertGoalsByMonth);     // ?month=YYYY-MM

// =======================
// EXTERNAS (SEM AUTH)
// =======================
// tudo via token (query/header). controller valida.

router.get('/external/cards', externalListCards);               // ?token=...
router.get('/external/cards/:id', externalGetCard);             // ?token=...
router.post('/external/cards/:id/approve', externalApproveCard);// body: { token, author? }
router.post('/external/cards/:id/change', externalRequestChange);// body: { token, targets:[design|text], comment?, author? }
router.post('/external/cards/:id/comment', externalAddComment);  // body: { token, text, target?, author? }

module.exports = router;
