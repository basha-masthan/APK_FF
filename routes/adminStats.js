const express = require('express');
const router = express.Router();
const User = require('../models/User');
const requireLogin = require('../middleware/requireLogin');
const AdminOnly = require('../middleware/adminOnly');
const mongoose = require('mongoose');
const Tournament = require('../models/Tournament');
const MatchRegistration = require('../models/MatchRegistration');
const Transaction = require('../models/Transaction');
const withdraw = require('../models/withdraw');

const tournamentController = require('../controllers/tournamentController');

router.get('/stats', AdminOnly, async (req, res) => {



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
    res.status(500).json({ error: 'Failed' }).redirect('/admin/login.html');

  }
});

const { getMatchRegistrations, updateMatchRegistration, bulkUpdateMatchRegistrations } = require('../controllers/matchRegistrationController');

router.get('/match-registrations',AdminOnly, getMatchRegistrations);
router.put('/match-registrations/:tournamentId/:username/update',AdminOnly, updateMatchRegistration);

router.put('/match-registrations/bulk-update', bulkUpdateMatchRegistrations);

const { getAllWithdrawRequests, updateWithdrawRequest } = require('../controllers/WithdrawUpdates');

router.get('/withdraw', AdminOnly, getAllWithdrawRequests);
router.put('/withdraw/:id', updateWithdrawRequest);

router.get('/tournaments', AdminOnly, tournamentController.getTournaments);
router.post('/tournaments/create', AdminOnly, tournamentController.createTournament);
router.patch('/tournaments/:id', AdminOnly, tournamentController.updateTournament);
router.delete('/tournaments/:id', AdminOnly, tournamentController.deleteTournament);
router.put('/match-registrations/tournament-complete-update', AdminOnly, tournamentController.tournamentCompleteUpdate);





const Notification = require('../models/Notification');



router.post('/notifications', AdminOnly, async (req, res) => {
 

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


router.get('/tournaments',  AdminOnly, async (req, res) => {
  try {
    // adjust filter as needed (e.g., only upcoming/ongoing)
    const list = await Tournament.find({ status: { $in: ['Upcoming', 'Ongoing'] } })
      .sort({ startTime: 1 })
      .select('tournamentId game.name startTime status')
      .lean();
    res.json(list);
  } catch (err) {
    console.error('Failed to fetch tournaments:', err);
    res.status(500).json({ error: 'Failed to load tournaments' });
  }
});

router.get('/tournament-registrations',  AdminOnly, async (req, res) => {
  try {
    const { tournamentId } = req.query;
    if (!tournamentId) return res.status(400).json({ error: 'tournamentId required' });

    const tournament = await Tournament.findOne({ tournamentId }).select('_id').lean();
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    const regs = await MatchRegistration.find({
      tournamentId: tournament._id,
      status: 'Registered'
    }).select('username').lean();

    const usernames = [...new Set(regs.map(r => r.username))];
    res.json({ usernames });
  } catch (err) {
    console.error('Failed to fetch registrations:', err);
    res.status(500).json({ error: 'Failed to load registrations' });
  }
});


// const MatchRegistration = require('../models/MatchRegistration');
// const Tournament = require('../models/Tournament');

// 🧾 GET: All screenshots grouped by match
router.get('/screenshots-by-match', async (req, res) => {
  try {
    const registrations = await MatchRegistration.find({ screenshotUrl: { $ne: '' } })
      .populate('tournamentId')
      .lean();

    const grouped = {};

    for (let reg of registrations) {
      const tid = reg.tournamentId?._id || 'Unknown';
      const title = reg.tournamentId?.tournamentId || 'Untitled Match';

      if (!grouped[tid]) grouped[tid] = {
        title,
        players: []
      };

      grouped[tid].players.push({
          _id: reg._id,                    // ✅ Required for OCR
        username: reg.username,
        freefireId: reg.freefireId,
        screenshotUrl: reg.screenshotUrl,
        kills: reg.kills || '-',
        placement: reg.position || '-',
        verified: reg.screenshotVerified || false
      });
    }

    res.json(Object.values(grouped));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch screenshots' });
  }
});



module.exports = router;

