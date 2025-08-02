const express = require('express');
const router = express.Router();
const Tournament = require('../models/Tournament');
const MatchRegistration = require('../models/MatchRegistration');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendToUser } = require('./sseManager');

// POST /admin/notify-tournament
// body: { tournamentId: string (the unique tournamentId), title, message, link?, type? }
router.post('/admin/notify-tournament', async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    const { tournamentId, title, message, link, type = 'info' } = req.body;
    if (!tournamentId || !title || !message) {
      return res.status(400).json({ error: 'tournamentId, title, and message are required' });
    }

    // Find the tournament by its public ID
    const tournament = await Tournament.findOne({ tournamentId }).lean();
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Get all registered participants for that tournament
    const regs = await MatchRegistration.find({
      tournamentId: tournament._id,
      status: 'Registered'
    }).lean();

    if (!regs || regs.length === 0) {
      return res.status(200).json({ sent: 0, info: 'No registered users to notify' });
    }

    // Extract unique usernames from registrations
    const usernames = [...new Set(regs.map(r => r.username))];

    // Resolve users by uname
    const users = await User.find({ uname: { $in: usernames } }).select('_id uname').lean();
    if (!users || users.length === 0) {
      return res.status(200).json({ sent: 0, info: 'No matching user accounts for registered unames' });
    }

    // Create notifications for each user and broadcast via SSE
    const results = await Promise.all(users.map(async user => {
      const note = await Notification.create({
        userId: user._id,
        title,
        message,
        link: link || '',
        type,
        read: false
      });
      // push via SSE
      sendToUser(user._id, { notification: note });
      return { user: user.uname, notificationId: note._id };
    }));

    return res.json({ sent: results.length, details: results });
  } catch (err) {
    console.error('Error notifying tournament participants:', err);
    return res.status(500).json({ error: 'Failed to notify participants', details: err.message });
  }
});

module.exports = router;
