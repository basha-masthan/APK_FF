const express = require('express');
const router = express.Router();
const User = require('../models/User');
const requireLogin = require('../middleware/requireLogin');
// mongoose
const mongoose = require('mongoose');
const Tournament = require('../models/Tournament');
const MatchRegistration = require('../models/MatchRegistration');
const Transaction = require('../models/Transaction');
const withdraw = require('../models/withdraw');

const tournamentController = require('../controllers/tournamentController');

router.get('/stats', async (req, res) => {
  const { from, to } = req.query;

  const start = from ? new Date(from) : new Date('2000-01-01');
  const end = to ? new Date(to) : new Date();

  try {
    const users = await User.countDocuments({ createdAt: { $gte: start, $lte: end } });
    const tournaments = await Tournament.countDocuments({ createdAt: { $gte: start, $lte: end } });
    const matches = await MatchRegistration.countDocuments({ createdAt: { $gte: start, $lte: end } });
   
    
    const transactions = await Transaction.aggregate([
      {
        $match: {
          type: 'Entry Fee',
          status: 'Success',
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" }
        }
      }
    ]);
    const earned = transactions[0]?.total || 0;
    console.log("Stats:", users, tournaments, matches, earned);

    res.json({ users, tournaments, matches, earned });
  } catch (err) {
    console.error("Error getting stats:", err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

const { getMatchRegistrations, updateMatchRegistration, bulkUpdateMatchRegistrations } = require('../controllers/matchRegistrationController');

router.get('/match-registrations', getMatchRegistrations);
router.put('/match-registrations/:tournamentId/:username/update', updateMatchRegistration);

router.put('/match-registrations/bulk-update', bulkUpdateMatchRegistrations);

const { getAllWithdrawRequests, updateWithdrawRequest } = require('../controllers/WithdrawUpdates');

router.get('/withdraw', getAllWithdrawRequests);
router.put('/withdraw/:id', updateWithdrawRequest);

router.get('/tournaments', tournamentController.getTournaments);
router.post('/tournaments/create', tournamentController.createTournament);
router.patch('/tournaments/:id', tournamentController.updateTournament);
router.delete('/tournaments/:id', tournamentController.deleteTournament);
router.put('/match-registrations/tournament-complete-update', tournamentController.tournamentCompleteUpdate);





const Notification = require('../models/Notification');



router.post('/notifications', async (req, res) => {
 

  let { userIds, userNames, title, message, link, type } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: 'title and message are required' });
  }

  let targetIds = [];

  if (Array.isArray(userIds) && userIds.length > 0) {
    targetIds = userIds;
  } else if (Array.isArray(userNames) && userNames.length > 0) {
    // resolve unames to ObjectIds
    const users = await User.find({ uname: { $in: userNames } }).distinct('_id');
    targetIds = users;
  }

  if (targetIds.length === 0) {
    return res.status(400).json({ error: 'No valid users provided' });
  }

  const docs = targetIds.map(uid => ({
    userId: uid,
    title,
    message,
    link,
    type: type || 'info'
  }));

  try {
    await Notification.insertMany(docs);
    res.json({ success: true, sent: targetIds.length });
  } catch (err) {
    console.error('Error creating notifications:', err);
    res.status(500).json({ error: 'Failed to send notifications' });
  }
});

// route: GET /admin/notifications/list
router.get('/notifications/list', async (req, res) => {
  if (!req.session || !req.session.isAdmin) return res.status(403).json({ error: 'Forbidden' });
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
      user: n.userId ? { id: n.userId._id, uname: n.userId.uname, email: n.userId.email } : null
    }));

    res.json({ notifications: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});






module.exports = router;

