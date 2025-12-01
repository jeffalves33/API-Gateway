// Arquivo: routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { uploadAvatar } = require('../middleware/uploadMiddleware');
const {
  addAvatarProfileBucket,
  checkAuthStatus,
  deleteUserAccount,
  forgotPassword,
  getUserProfile,
  loginUser,
  logoutUser,
  registerUser,
  resetPassword,
  updateUserProfile
} = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', authenticateToken, getUserProfile);
router.get('/auth-status', authenticateToken, checkAuthStatus);
router.post('/avatar', authenticateToken, uploadAvatar.single('avatar'), addAvatarProfileBucket);
router.put('/update', authenticateToken, updateUserProfile);
router.delete('/delete-account', authenticateToken, deleteUserAccount);
router.post('/logout', authenticateToken, logoutUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;