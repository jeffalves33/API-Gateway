// Arquivo: routes/institutionalRoutes.js

const express = require('express');
const router = express.Router();
const { checkAuthStatus } = require('../middleware/authMiddleware');
const institutionalController = require('../controllers/institutionalController');

// Página inicial institucional
router.get('/', checkAuthStatus, institutionalController.getHomePage);
router.get('/about', checkAuthStatus, institutionalController.getAboutPage);
router.get('/pricing', checkAuthStatus, institutionalController.getPricingPage);
router.get('/features', checkAuthStatus, institutionalController.getFeaturesPage);

// Rota para redirecionar usuário logado para sua área
router.get('/go-to-app', checkAuthStatus, institutionalController.redirectToUserArea);

module.exports = router;