// Arquivo: controllers/institutionalController.js

const path = require('path');

// Página inicial institucional
exports.getHomePage = async (req, res) => {
    try {
        // Passa informações do usuário logado para a página institucional
        const isLoggedIn = !!req.user;
        const userInfo = req.user || null;
        // Se você quiser passar dados para o frontend, pode usar query params ou renderizar com template engine
        // Por enquanto, vamos apenas servir o arquivo HTML
        res.sendFile(path.join(__dirname, '..', 'public', 'institutional', 'homePage.html'));
    } catch (error) {
        console.error('Erro ao carregar página inicial:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
};

// Página sobre
exports.getAboutPage = async (req, res) => {
    try {
        res.sendFile(path.join(__dirname, '..', 'public', 'institutional', 'aboutPage.html'));
    } catch (error) {
        console.error('Erro ao carregar página sobre:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
};

// Página de preços
exports.getPricingPage = async (req, res) => {
    try {
        res.sendFile(path.join(__dirname, '..', 'public', 'institutional', 'pricingPage.html'));
    } catch (error) {
        console.error('Erro ao carregar página de preços:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
};

// Página de funcionalidades
exports.getFeaturesPage = async (req, res) => {
    try {
        res.sendFile(path.join(__dirname, '..', 'public', 'institutional', 'featuresPage.html'));
    } catch (error) {
        console.error('Erro ao carregar página de funcionalidades:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
};

// Redirecionar usuário logado para sua área
exports.redirectToUserArea = async (req, res) => {
    try {
        if (!req.user) {
            return res.redirect('/login');
        }

        // Redireciona para a área do usuário usando seu ID
        res.redirect(`/${req.user.id}`);
    } catch (error) {
        console.error('Erro ao redirecionar para área do usuário:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
};
