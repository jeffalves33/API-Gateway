// Arquivo: app.js
const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');

const { testConnection } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const metricsRoutes = require('./routes/metricsRoutes');
const metaRoutes = require('./routes/metaRoutes');
const googleAnalyticsRoutes = require('./routes/googleAnalyticsRoutes');
const institutionalRoutes = require('./routes/institutionalRoutes'); // Nova rota

const { authenticatePageAccess } = require('./middleware/authMiddleware');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Arquivos estáticos
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// === Rotas da API ===
app.use('/api', authRoutes); // Não deve ser /api
app.use('/api/metrics', metricsRoutes);

//Refatorado
app.use('/api/googleAnalytics', googleAnalyticsRoutes);
app.use('/api/meta', metaRoutes);
app.use('/customer', customerRoutes);

// === Rotas Institucionais ===
app.use('/', institutionalRoutes);

// === Páginas protegidas ===
app.get('/dashboardPage.html', authenticatePageAccess, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboardPage.html'));
});

app.get('/analyzesPage.html', authenticatePageAccess, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'analyzesPage.html'));
});

app.get('/chatPage.html', authenticatePageAccess, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chatPage.html'));
});

app.get('/platformsPage.html', authenticatePageAccess, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'platformsPage.html'));
});

app.get('/customersPage.html', authenticatePageAccess, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'customersPage.html'));
});

app.get('/myCustomersPage.html', authenticatePageAccess, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'myCustomersPage.html'));
});

app.get('/settingsAccountPage.html', authenticatePageAccess, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'settingsAccountPage.html'));
});

// === Páginas públicas ===
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/privacyPolicyPage.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacyPolicyPage.html'));
});

app.get('/termsUse.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'termsUse.html'));
});

// === Área do usuário com ID ===
app.get('/:userId', authenticatePageAccess, (req, res, next) => {
  const userId = req.params.userId;

  // Evita colisão com arquivos .html e rotas inválidas
  if (!/^\d+$/.test(userId)) {
    return next(); // pula para o próximo middleware (404 ou outras rotas)
  }

  // Verificar se o userId corresponde ao usuário logado
  if (req.user && req.user.id.toString() === userId) {
    res.sendFile(path.join(__dirname, 'public', 'dashboardPage.html'));
  } else {
    res.status(403).json({
      success: false,
      message: 'Acesso negado. Você não tem permissão para acessar esta área.'
    });
  }
});

// === Middleware para capturar rotas não encontradas ===
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Página não encontrada'
  });
});

// === Inicialização do servidor ===
app.listen(port, async () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
  await testConnection(); // Verifica conexão com o banco ao iniciar
});

module.exports = app;
