// routes/results.js
const express = require('express');
const router = express.Router();
const MatchRegistration = require('../models/MatchRegistration');
const Tournament = require('../models/Tournament');
const requireLogin = require('../middleware/requireLogin');

// GET /results/mine
router.get('/mine', requireLogin, async (req, res) => {
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
