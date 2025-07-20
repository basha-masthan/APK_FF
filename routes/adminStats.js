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

// ✅ FINALIZE route
router.post("/match-registrations/:tournamentId/finalize", async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ success: false, error: "Invalid data format" });
    }

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) return res.status(404).json({ success: false, error: "Tournament not found" });

    const totalCollected = (tournament.totalSlots - tournament.availableSlots) * tournament.entryFee;
    const totalDistribution = updates.reduce((sum, u) => sum + (u.moneyEarned || 0), 0);

    if (totalDistribution > totalCollected) {
      return res.status(400).json({ success: false, error: "Distribution exceeds total collected amount" });
    }

    for (const { username, kills, moneyEarned } of updates) {
      await MatchRegistration.updateOne(
        { username, tournamentId },
        { $set: { kills, moneyEarned } }
      );

      const user = await User.findOne({ uname: username });
      // if (user) {
        // user.winningMoney = (user.winningMoney || 0) + moneyEarned;
        await user.save();

      //   await Transaction.create({
      //     username,
      //     type: 'Winning Amount',
      //     amount: moneyEarned,
      //     status: 'Success',
      //     note: `Winnings from tournament ${tournament.tournamentId}`,
      //   });
      // }
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Finalize error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});


// const Tournament = require('../models/Tournament');

router.get('/match2-registrations', async (req, res) => {
  try {
    const registrations = await MatchRegistration.find();
    const grouped = {};

    for (const reg of registrations) {
      const tid = reg.tournamentId;
      if (!grouped[tid]) {
        const tournament = await Tournament.findOne({ tournamentId: tid });
        grouped[tid] = {
          tournament,
          players: []
        };
      }
      grouped[tid].players.push(reg);
    }

    res.json({ success: true, data: grouped });
  } catch (err) {
    console.error(err);
    res.json({ success: false, error: 'Server error' });
  }
});

// GET /admin/tournaments - Fetch all tournaments (optional sort support)
router.get('/tournaments2', async (req, res) => {
  try {
    const sort = req.query.sort === 'asc' ? 1 : -1;

    const tournaments = await Tournament.find().sort({ startTime: sort });

    res.json({ success: true, data: tournaments });
  } catch (err) {
    console.error('Error fetching tournaments:', err);
    res.status(500).json({ success: false, error: 'Server error while fetching tournaments' });
  }
});



module.exports = router;

