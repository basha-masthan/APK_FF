const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../models/User'); // <--- added
const { addClient, removeClient, sendToUser } = require('../utils/sseManager');
const AdminOnly = require('../middleware/adminOnly');



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
router.get('/notifications/list', AdminOnly,  async (req, res) => {
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

// routes/notifications.js


router.get('/notifications', async (req, res) => {
  try {
    if (!req.session?.userId) {
      console.warn('Missing userId in session for notifications fetch.');
      return res.json({ notifications: [] });
    }
    const notes = await Notification.find({ userId: req.session.userId })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ notifications: notes });
  } catch (err) {
    console.error('Failed to load notifications:', err);
    res.status(500).json({ error: 'Failed to load notifications' });
  }
});

router.put('/notifications/:id/read', async (req, res) => {
  try {
    const note = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.session.userId },
      { $set: { read: true } },
      { new: true }
    );
    res.json({ success: !!note });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

router.put('/notifications/mark-all-read', async (req, res) => {
  try {
    if (!req.session?.userId) {
      console.warn('PUT /not/notifications/mark-all-read without userId in session');
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    const userId = req.session.userId;

    // Update all unread notifications for this user
    const updateResult = await Notification.updateMany(
      { userId, read: false },
      { $set: { read: true } }
    );
    console.log('mark-all-read updateResult:', updateResult);

    // Fetch updated list
    const updated = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    // Push updated list to SSE clients
    sendToUser(userId, { notifications: updated });

    return res.json({ notifications: updated });
  } catch (err) {
    console.error('Failed to mark all read (detailed):', err);
    return res.status(500).json({
      error: 'Failed to update',
      details: err.message
    });
  }
});



module.exports = router;
