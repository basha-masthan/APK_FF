const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../models/User'); // <--- added



// Admin: send notifications by userIds or userNames
// Mounted at /admin/notifications if used as app.use('/admin', router)
router.post('/notifications',  async (req, res) => {
  try {
    let { userIds, userNames, title, message, link, type } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'title and message are required' });
    }

    let targetIds = [];

    if (Array.isArray(userIds) && userIds.length > 0) {
      targetIds = userIds;
    } else if (Array.isArray(userNames) && userNames.length > 0) {
      const users = await User.find({ uname: { $in: userNames } }).select('_id');
      targetIds = users.map(u => u._id);
    }

    if (targetIds.length === 0) {
      return res.status(400).json({ error: 'No valid users provided' });
    }

    const docs = targetIds.map(uid => ({
      userId: uid,
      title,
      message,
      link,
      type: type || 'info',
      read: false
    }));

    await Notification.insertMany(docs);
    res.json({ success: true, sent: targetIds.length });
  } catch (err) {
    console.error('Error creating notifications:', err);
    res.status(500).json({ error: 'Failed to send notifications' });
  }
});

// Admin: list all notifications (with user info)
router.get('/notifications/list',  async (req, res) => {
  try {
    const notes = await Notification.find()
      .sort({ createdAt: -1 })
      .populate({ path: 'userId', select: 'uname email' })
      .lean();

    const formatted = notes.map(n => ({
      _id: n._id,
      title: n.title,
      message: n.message,
      link: n.link,
      type: n.type,
      read: n.read,
      createdAt: n.createdAt,
      user: n.userId
        ? { id: n.userId._id, uname: n.userId.uname, email: n.userId.email }
        : null
    }));

    res.json({ notifications: formatted });
  } catch (err) {
    console.error('Failed to fetch notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// User: get their own notifications
router.get('/notifications',  async (req, res) => {
  try {
    const notes = await Notification.find({ userId: req.session.userId })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ notifications: notes });
  } catch (err) {
    console.error('Failed to load notifications:', err);
    res.status(500).json({ error: 'Failed to load notifications' });
  }
});

// User: mark a notification read
router.put('/notifications/:id/read',  async (req, res) => {
  try {
    const note = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.session.userId },
      { read: true },
      { new: true }
    );
    if (!note) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Could not update notification:', err);
    res.status(500).json({ error: 'Could not update' });
  }
});

module.exports = router;
