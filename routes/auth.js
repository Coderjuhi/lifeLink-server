const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Auth Routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);

router.get('/me', authMiddleware, authController.me);
router.post('/logout', authController.logout);

// ADD THIS — Update Availability Route
router.put(
  '/update-availability',
  authMiddleware,
  authController.updateAvailability
);

module.exports = router;
