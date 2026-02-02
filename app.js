// Arquivo: app.js
const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const { handleStripeWebhook } = require('./controllers/stripeWebhookController');
const billingRoutes = require('./routes/billingRoutes');
const { testConnection } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const contactRoutes = require('./routes/contactRoutes');
const contentsRoutes = require('./routes/contentsRoutes');
const customerRoutes = require('./routes/customerRoutes');
const goalsRoutes = require('./routes/goalsRoutes');
const kanbanRoutes = require('./routes/kanbanRoutes');
const metricsRoutes = require('./routes/metricsRoutes');
const googleAnalyticsRoutes = require('./routes/googleAnalyticsRoutes');
const linkedinRoutes = require('./routes/linkedinRoutes');
const metaRoutes = require('./routes/metaRoutes');
const youtubeRoutes = require('./routes/youtubeRoutes');
const { authenticatePageAccess } = require('./middleware/authMiddleware');

// removi o middleware pois o redirecionamento de planos é pelo modal em cada tela
const requireSubscription = require('./middleware/subscriptionMiddleware');

const landingDir = path.join(__dirname, 'public', 'institutional', 'out');

const app = express();
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook); // <-- RAW! :contentReference[oaicite:20]{index=20}
const port = process.env.PORT || 3000;


// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Arquivos estáticos
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// === Rotas da API ===
app.use('/api', authRoutes); // Não deve ser /api
app.use('/api/billing', billingRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/contents', contentsRoutes);
app.use('/api/kanban', kanbanRoutes);

//Refatorado
app.use('/api/contact', contactRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/googleAnalytics', googleAnalyticsRoutes);
app.use('/api/linkedin', linkedinRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/customer', customerRoutes);

// Institucional
app.use('/', express.static(landingDir, {
  redirect: true,         // permite /sobre -> redireciona para /sobre/
  maxAge: '7d',
  setHeaders: (res, filePath) => {
    // Evitar cache em HTML pra facilitar atualizações
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
  }
}));
app.get('/', (req, res) => {
  res.sendFile(path.join(landingDir, 'index.html'));
});

// === Páginas protegidas ===
app.get('/analyzesPage.html', authenticatePageAccess, (req, res) => { res.sendFile(path.join(__dirname, 'public', 'analyzesPage.html')); });
//app.get('/chatPage.html', authenticatePageAccess, (req, res) => { res.sendFile(path.join(__dirname, 'public', 'chatPage.html')); });
app.get('/dashboardPage.html', authenticatePageAccess, (req, res) => { res.sendFile(path.join(__dirname, 'public', 'dashboardPage.html')); });
app.get('/foodModelPage.html', authenticatePageAccess, (req, res) => { res.sendFile(path.join(__dirname, 'public', 'foodModelPage.html')); });
app.get('/goalsPage.html', authenticatePageAccess, (req, res) => { res.sendFile(path.join(__dirname, 'public', 'goalsPage.html')); });
app.get('/kanbanPage.html', authenticatePageAccess, (req, res) => { res.sendFile(path.join(__dirname, 'public', 'kanbanPage.html')); });
app.get('/myCustomersPage.html', authenticatePageAccess, (req, res) => { res.sendFile(path.join(__dirname, 'public', 'myCustomersPage.html')); });
app.get('/settingsAccountPage.html', authenticatePageAccess, (req, res) => { res.sendFile(path.join(__dirname, 'public', 'settingsAccountPage.html')); });

// === Páginas públicas ===
app.get('/login.html', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'login.html')); });
app.get('/forgotPassword.html', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'forgotPassword.html')); });
app.get('/resetPassword.html', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'resetPassword.html')); });
app.get('/register.html', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'register.html')); });
app.get('/privacyPolicyPage.html', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'privacyPolicyPage.html')); });
app.get('/termsUse.html', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'termsUse.html')); });
app.get("/aprovacoes/:cliente", (req, res, next) => { res.sendFile(path.join(__dirname, 'public', 'externoPage.html')); });
// === Área do usuário com ID ===
app.get('/:userId', authenticatePageAccess, (req, res, next) => {
  const userId = req.params.userId;

  // Evita colisão com arquivos .html e rotas inválidas
  if (!/^\d+$/.test(userId)) return next(); // pula para o próximo middleware (404 ou outras rotas)

  // Verificar se o userId corresponde ao usuário logado
  if (req.user && req.user.id.toString() === userId) res.sendFile(path.join(__dirname, 'public', 'dashboardPage.html'));
  else {
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
