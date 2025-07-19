const express = require('express');
const router = express.Router();
const User = require('../models/User');
const requireLogin = require('../middleware/requireLogin');
// mongoose
const mongoose = require('mongoose');
const Tournament = require('../models/Tournament');
const MatchRegistration = require('../models/MatchRegistration');
const Transaction = require('../models/Transaction');




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


router.get('/match-registrations', async (req, res) => {
  try {
    const registrations = await MatchRegistration.find().populate('tournamentId').lean();

    // 🔁 Group by tournamentId
    const grouped = {};

    for (const reg of registrations) {
      const tid = reg.tournamentId?._id?.toString();

      // skip if tournament not found or deleted
      if (!tid || !reg.tournamentId) continue;

      if (!grouped[tid]) {
        grouped[tid] = {
          tournament: {
            dbId: reg.tournamentId._id, // Pass the database ID
            tournamentId: reg.tournamentId.tournamentId,
            totalSlots: reg.tournamentId.totalSlots,
            availableSlots: reg.tournamentId.availableSlots,
            perKillReward: reg.tournamentId.perKillReward,
            date: reg.tournamentId.date
          },
          players: []
        };
      }

      grouped[tid].players.push({
        username: reg.username,
        freefireId: reg.freefireId,
        kills: reg.kills || 0,
        moneyEarned: reg.moneyEarned || 0
      });
    }

    res.json({ success: true, data: grouped });
  } catch (err) {
    console.error('🚨 /match-registrations error:', err);
    res.status(500).json({ success: false, error: 'server-error', message: err.message });
  }
});




// ✅ Update kills + moneyEarned based on username (admin)
router.put('/match-registrations/:tournamentId/:username/update', async (req, res) => {
  const { tournamentId, username } = req.params;
  const { kills, moneyEarned } = req.body;

  try {
    // ✅ Find tournament by Mongo ID
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ success: false, error: 'Tournament not found' });
    }

    // ✅ Update match registration
    const registration = await MatchRegistration.findOneAndUpdate(
      { tournamentId: tournament._id, username },
      {
        $set: {
          kills: parseInt(kills),
          moneyEarned: parseFloat(moneyEarned),
        },
      },
      { new: true }
    );

    if (!registration) {
      return res.status(404).json({ success: false, error: 'Match registration not found' });
    }

    // ✅ Update user's winning balance and log transaction
    const user = await User.findOne({ uname: username });
    if (user) {
      user.winningMoney = (user.winningMoney || 0) + parseFloat(moneyEarned);
      await user.save();

      await Transaction.create({
        username,
        type: 'Winning Amount',
        amount: parseFloat(moneyEarned),
        status: 'Success',
        note: `Winnings from tournament ${tournament.title}`,
      });
    }

    res.json({ success: true, data: registration });
  } catch (err) {
    console.error('Match update error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});



const withdraw = require('../models/withdraw');

router.get('/withdraw', async (req, res) => {
  try {
    const requests = await withdraw.find().sort({ createdAt: -1 });
    res.json({ success: true, data: requests });
  } catch (err) {
    console.error("Fetch withdraw requests error:", err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});


router.put('/withdraw/:id', async (req, res) => {
  const { status } = req.body; // 'Completed' or 'Cancelled'
  const { id } = req.params;

  try {
    // 🟡 Validate input
    if (!['Completed', 'Cancelled'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    // 🔍 1. Find the withdraw request
    const request = await withdraw.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Withdraw request not found' });
    }

    // 🔍 2. Find and update matching transaction
    const txn = await Transaction.findOneAndUpdate(
      {
        username: request.username,
        type: 'Withdraw',
        amount: { $eq: parseFloat(request.amount) }, // Ensure number match
        status: 'Pending'
      },
      { status },
      { new: true }
    );

    if (!txn) {
      console.warn(`❗ No matching transaction for user=${request.username}, amount=₹${request.amount}`);
      return res.status(404).json({ success: false, error: 'Matching transaction not found' });
    }

    // 💸 3. If Cancelled, refund the user
    if (status === 'Cancelled') {
      const user = await User.findOne({ uname: request.username });
      if (user) {
        user.winningMoney = (user.winningMoney || 0) + parseFloat(request.amount);
        await user.save();
        console.log(`💸 Refunded ₹${request.amount} to ${user.uname}`);
      } else {
        console.warn(`❗ User not found: ${request.username}`);
        return res.status(404).json({ success: false, error: 'User not found for refund' });
      }
    }

    // 🗑️ 4. Remove the withdraw request from DB
    await withdraw.findByIdAndDelete(id);

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Withdraw update error:", err);
    res.status(500).json({ success: false, error: "Failed to update withdraw request" });
  }
});


module.exports = router;

