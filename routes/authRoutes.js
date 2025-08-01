// Arquivo: routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { uploadAvatar } = require('../middleware/uploadMiddleware');
const {
  addAvatarProfileBucket,
  updateUserProfile,
  deleteUserAccount,
  registerUser,
  loginUser,
  getUserProfile,
  logoutUser,
  checkAuthStatus
} = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', authenticateToken, getUserProfile);
router.post('/avatar', authenticateToken, uploadAvatar.single('avatar'), addAvatarProfileBucket);
router.put('/update', authenticateToken, updateUserProfile);
router.delete('/delete-account', authenticateToken, deleteUserAccount);
router.post('/logout', authenticateToken, logoutUser);

router.get('/auth-status', authenticateToken, checkAuthStatus);

module.exports = router;