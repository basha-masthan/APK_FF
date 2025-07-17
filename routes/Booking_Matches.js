const express = require('express');
const router = express.Router();
const requireLogin = require('../middleware/requireLogin');
const Tournament = require('../models/Tournament');
const MatchRegistration = require('../models/MatchRegistration');
const Transaction = require('../models/Transaction');
const User = require('../models/User'); // use User instead of Wallet



router.post('/book', requireLogin, async (req, res) => {
  try {
    const username = req.session.user?.uname;
    const { tournamentId, freefireId } = req.body;

    if (!username) return res.status(401).json({ error: 'User not logged in' });
    if (!freefireId || freefireId.length < 5) {
      return res.status(400).json({ error: 'Invalid Free Fire ID' });
    }

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    if (tournament.availableSlots <= 0) {
      return res.status(400).json({ error: 'No slots left' });
    }

    const existing = await MatchRegistration.findOne({ tournamentId, freefireId });
    if (existing) {
      return res.status(400).json({ error: 'This Free Fire ID already registered' });
    }

    const user = await User.findOne({ uname: username });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const totalBalance = (user.balance || 0) + (user.winningMoney || 0);
    if (totalBalance < tournament.entryFee) {
      return res.status(400).json({ error: 'Insufficient total balance' });
    }

    // Deduct from balance first, then winningMoney
    let remainingFee = tournament.entryFee;

    if (user.balance >= remainingFee) {
      user.balance -= remainingFee;
    } else {
      remainingFee -= user.balance;
      user.balance = 0;

      user.winningMoney -= remainingFee;
    }

    await user.save();

    await MatchRegistration.create({
      username,
      freefireId,
      tournamentId,
      status: 'Registered'
    });

    tournament.availableSlots -= 1;
    await tournament.save();

    await Transaction.create({
      username,
      type: 'Entry Fee',
      amount: tournament.entryFee,
      status: 'Success',
      note: `Joined tournament ${tournament.tournamentId}`
    });

    res.json({ success: true });

  } catch (err) {
    console.error("Booking error:", err);
    res.status(500).json({ error: 'Booking failed internally' });
  }
});



router.get('/my-matches', requireLogin, async (req, res) => {
  try {
    const username = req.session.user.uname;

    const matches = await MatchRegistration.find({ username })
      .populate('tournamentId') // 🔥 This fills the full tournament data
      .sort({ createdAt: -1 });

    res.json(matches);
  } catch (err) {
    console.error("❌ Error fetching my matches:", err);
    res.status(500).json({ error: "Failed to fetch matches" });
  }
});




router.get('/Results', requireLogin, async (req, res) => {
  const username = req.session.user?.uname;

  try {
    const registrations = await MatchRegistration.find({ username });

    const resultsMap = {};

    for (const reg of registrations) {
      const tournament = await Tournament.findById(reg.tournamentId);
      const allPlayers = await MatchRegistration.find({ tournamentId: reg.tournamentId });

      resultsMap[reg.tournamentId] = {
        tournament,
        players: await Promise.all(allPlayers.map(async (player) => ({
          username: player.username,
          freefireId: player.freefireId,
          kills: player.kills,
          moneyEarned: player.moneyEarned,
          joinedAt: player.createdAt,
          isCurrentUser: player.username === username
        })))
      };
    }

    res.json({ success: true, data: resultsMap });
  } catch (err) {
    console.error("Error fetching match results:", err);
    res.status(500).json({ success: false });
  }
});




module.exports = router;
