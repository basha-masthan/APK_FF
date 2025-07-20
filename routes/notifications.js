const express = require('express');
const router = express.Router();
const User = require('../models/User');
const NotificationService = require('../services/notificationService');
const requireLogin = require('../middleware/requireLogin');

// Register FCM token
router.post('/register-token', requireLogin, async (req, res) => {
  try {
    const { token, device } = req.body;
    const username = req.session.user.uname;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    const user = await User.findOne({ uname: username });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Update or add token
    const existingToken = user.fcmTokens.find(t => t.token === token);
    if (existingToken) {
      existingToken.isActive = true;
      existingToken.device = device || 'web';
    } else {
      user.fcmTokens.push({
        token,
        device: device || 'web',
        isActive: true
      });
    }

    await user.save();
    res.json({ success: true, message: 'Token registered successfully' });

  } catch (error) {
    console.error('❌ Token registration error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Test notification
router.post('/test', requireLogin, async (req, res) => {
  try {
    const username = req.session.user.uname;
    const result = await NotificationService.sendToUser(username, {
      title: '🔔 Test Notification',
      body: 'Firebase notifications are working perfectly!',
      type: 'test'
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update notification preferences
router.put('/preferences', requireLogin, async (req, res) => {
  try {
    const username = req.session.user.uname;
    const preferences = req.body;

    await User.updateOne(
      { uname: username },
      { $set: { notificationSettings: preferences } }
    );

    res.json({ success: true, message: 'Preferences updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
