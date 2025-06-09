// Arquivo: middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateToken = (req, res, next) => {
  const token = req.cookies.jwt;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Acesso negado. Token não fornecido.' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'seu_segredo_jwt');
    req.user = verified;
    next();
  } catch (error) {
    res.clearCookie('jwt');
    res.status(400).json({ success: false, message: 'Token inválido ou expirado' });
  }
};

const authenticatePageAccess = (req, res, next) => {
  const token = req.cookies.jwt;

  if (!token) {
    return res.redirect('/login.html');
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'seu_segredo_jwt');
    req.user = verified;
    next();
  } catch (error) {
    res.clearCookie('jwt');
    res.redirect('/login.html');
  }
};

const checkAuthStatus = (req, res, next) => {
  const token = req.cookies.jwt;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'seu_segredo_jwt');
      req.user = decoded;
      req.isLoggedIn = true;
    } catch (error) {
      // Token inválido, limpar cookie
      res.clearCookie('jwt');
      req.user = null;
      req.isLoggedIn = false;
    }
  } else {
    req.user = null;
    req.isLoggedIn = false;
  }

  next();
};

module.exports = { authenticateToken, authenticatePageAccess, checkAuthStatus };