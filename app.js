// Arquivo: app.js

const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');

const { testConnection } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const customerFacebookRoutes = require('./routes/customerFacebookRoutes');
const metricsRoutes = require('./routes/metricsRoutes');
const metaRoutes = require('./routes/metaRoutes');
const googleAnalyticsRoutes = require('./routes/googleAnalyticsRoutes');

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
app.use('/api/customers/facebook', customerFacebookRoutes); // Refatorar
app.use('/', customerFacebookRoutes);
app.use('/api/metrics', metricsRoutes);

//Refatorado
app.use('/api/googleAnalytics', googleAnalyticsRoutes);
app.use('/api/meta', metaRoutes);
app.use('/customer', customerRoutes);

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
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

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

// === Inicialização do servidor ===
app.listen(port, async () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
  await testConnection(); // Verifica conexão com o banco ao iniciar
});

module.exports = app;
