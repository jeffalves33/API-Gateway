// Arquivo: routes/teamRoutes.js

const express = require('express');
const router = express.Router();

const teamController = require('../controllers/teamController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/rbacMiddleware');

// Administração de equipe (somente Admin -> via permission team:manage)
router.get('/members', authenticateToken, requirePermission('team:manage'), teamController.listMembers);
router.patch('/members/:id_team_member/disable', authenticateToken, requirePermission('team:manage'), teamController.disableMember);
router.patch('/members/:id_team_member/role', authenticateToken, requirePermission('team:manage'), teamController.updateMemberRole);

router.get('/invites', authenticateToken, requirePermission('team:manage'), teamController.listInvites);
router.post('/invites', authenticateToken, requirePermission('team:manage'), teamController.inviteMember);
router.post('/invites/:id_invite/resend', authenticateToken, requirePermission('team:manage'), teamController.resendInvite);
router.delete('/invites/:id_invite', authenticateToken, requirePermission('team:manage'), teamController.cancelInvite);

module.exports = router;
