// routes/support.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Tournament = require('../models/Tournament');
const SquadGroupSelection = require('../models/SquadGroupSelection');

// 📥 POST: Handle group selection
router.post('/squad-group', async (req, res) => {
  const { tournamentId, uname, freeFireId, group } = req.body;

  try {
    console.log('🔍 Incoming tournamentId from client:', tournamentId);

    const tournament = await Tournament.findOne({ tournamentId: tournamentId });

    if (!tournament) {
      return res.status(404).json({ error: '❌ Tournament not found by code.' });
    }

    if (tournament.status !== 'Upcoming') {
      return res.status(400).json({ error: `Tournament is not upcoming. Current status: ${tournament.status}` });
    }

    const existing = await SquadGroupSelection.findOne({ tournamentId: tournament._id, uname });
    if (existing) {
      return res.status(400).json({ error: 'You have already selected a group for this match.' });
    }

    const selection = new SquadGroupSelection({
      tournamentId: tournament._id,
      uname,
      freeFireId,
      group
    });

    await selection.save();

    res.json({ success: true, message: 'Group selected successfully.' });

  } catch (err) {
    console.error('❌ Squad group POST error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// const mongoose = require('mongoose');

router.get('/squad-group/:tournamentId', async (req, res) => {
  const { tournamentId } = req.params;

  try {
    // 1. Find the tournament by tournamentCode (string)
    const tournament = await Tournament.findOne({ tournamentId: tournamentId });
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found with this code.' });
    }

    // 2. Now use tournament._id to query SquadGroupSelection
    const groupData = await SquadGroupSelection.find({ tournamentId: tournament._id });

    // 3. Organize the results
    const grouped = {
      A: groupData.filter(u => u.group === 'A').map(u => ({ uname: u.uname, ffid: u.freeFireId })),
      B: groupData.filter(u => u.group === 'B').map(u => ({ uname: u.uname, ffid: u.freeFireId }))
    };

    res.json(grouped);

  } catch (err) {
    console.error('❌ Squad group fetch error:', err);
    res.status(500).json({ error: 'Server error while loading group data' });
  }
});



module.exports = router;
