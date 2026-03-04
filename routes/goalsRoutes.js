// Arquivo: routes/goalsRoutes.js
const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/rbacMiddleware');
const goals = require('../controllers/goalsController');

router.get('/', authenticateToken, goals.list);
router.get('/:id_goal', authenticateToken, goals.get);
router.post('/', authenticateToken, goals.create);
router.put('/:id_goal', authenticateToken, goals.update);
router.delete('/:id_goal', authenticateToken, goals.remove);

// sugestões por plataforma
router.post('/actions/suggestions', authenticateToken, requirePermission('analyses:run'), goals.suggestions);

// gerar análise do período (salvar analysis_text dentro da meta)
router.post('/:id_goal/actions/generate-analysis', authenticateToken, requirePermission('analyses:run'), goals.generateAnalysis);

module.exports = router;
