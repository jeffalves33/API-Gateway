// routes/rbacRoutes.js

const express = require('express');
const router = express.Router();

const rbacController = require('../controllers/rbacController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { ensurePermissions, requirePermission } = require('../middleware/rbacMiddleware');

// Qualquer usuário autenticado pode consultar seu próprio contexto RBAC
router.get('/me', authenticateToken, ensurePermissions, rbacController.getMeRbac);

// Listagens (Admin recomendado; mas útil para UI futura). Mantive como Admin-only.
router.get('/permissions', authenticateToken, requirePermission('team:manage'), rbacController.listPermissions);
router.get('/roles', authenticateToken, requirePermission('team:manage'), rbacController.listRoles);
router.get('/roles/:id_role/permissions', authenticateToken, requirePermission('team:manage'), rbacController.getRolePermissions);

// Gestão de roles (para futuro). Bloqueia roles do sistema (Admin/Equipe) no controller.
router.post('/roles', authenticateToken, requirePermission('team:manage'), rbacController.createRole);
router.put('/roles/:id_role', authenticateToken, requirePermission('team:manage'), rbacController.renameRole);
router.delete('/roles/:id_role', authenticateToken, requirePermission('team:manage'), rbacController.deleteRole);
router.put('/roles/:id_role/permissions', authenticateToken, requirePermission('team:manage'), rbacController.replaceRolePermissions);

module.exports = router;
