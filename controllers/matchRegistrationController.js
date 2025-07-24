// 📁 controllers/matchRegistrationController.js
const MatchRegistration = require('../models/MatchRegistration');
const Tournament = require('../models/Tournament');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// ✅ GET all match registrations grouped by tournament
exports.getMatchRegistrations = async (req, res) => {
  try {
    const registrations = await MatchRegistration.find().populate('tournamentId').lean();
    const grouped = {};

    for (const reg of registrations) {
      const tournament = reg.tournamentId;
      if (!tournament) continue;

      const tid = tournament._id.toString();
      if (!grouped[tid]) {
        grouped[tid] = {
          tournament: {
            dbId: tournament._id,
            tournamentId: tournament.tournamentId,
            totalSlots: tournament.totalSlots,
            availableSlots: tournament.availableSlots,
            perKillReward: tournament.perKillReward,
            entryFee: tournament.entryFee,
            prizeMoney: tournament.prizeMoney,
            date: tournament.startTime,
            startTime: tournament.startTime,
            status: tournament.status,
            game: tournament.game,
            mapName: tournament.mapName,
          },
          players: [],
        };
      }

      grouped[tid].players.push({
        username: reg.username,
        freefireId: reg.freefireId,
        kills: reg.kills || 0,
        moneyEarned: reg.moneyEarned || 0,
        status: reg.status,
        joinedAt: reg.joinedAt,
      });
    }

    res.json({ success: true, data: grouped });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server Error', message: err.message });
  }
};

// ✅ PUT update single match registration
exports.updateMatchRegistration = async (req, res) => {
  const { tournamentId, username } = req.params;
  const { kills, moneyEarned } = req.body;

  try {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) return res.status(404).json({ success: false, error: 'Tournament not found' });

    const registration = await MatchRegistration.findOneAndUpdate(
      { tournamentId, username },
      { kills: parseInt(kills), moneyEarned: parseFloat(moneyEarned) },
      { new: true }
    );

    if (!registration) return res.status(404).json({ success: false, error: 'Registration not found' });

    const user = await User.findOne({ uname: username });
    if (user) {
      user.winningMoney = (user.winningMoney || 0) + parseFloat(moneyEarned);
      await user.save();
      await Transaction.create({
        username,
        type: 'Winning Amount',
        amount: parseFloat(moneyEarned),
        status: 'Success',
        note: `Winnings from tournament ${tournament.tournamentId} - ${kills} kills`
      });
    }

    const topPlayer = await MatchRegistration.find({ tournamentId })
      .sort({ kills: -1, moneyEarned: -1 })
      .limit(1);

    if (topPlayer.length) {
      tournament.mvp = {
        username: topPlayer[0].username,
        kills: topPlayer[0].kills,
        moneyEarned: topPlayer[0].moneyEarned
      };
      await tournament.save();
    }

    res.json({ success: true, data: registration, mvp: tournament.mvp });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server Error', message: err.message });
  }
};

// ✅ Bulk update multiple registrations
exports.bulkUpdateMatchRegistrations = async (req, res) => {
  const { updates } = req.body;
  if (!Array.isArray(updates)) return res.status(400).json({ success: false, error: 'Invalid update format' });

  let updated = 0;
  const affectedTournaments = new Set();
  const mvpMap = new Map();

  for (const { tournamentId, username, kills, moneyEarned } of updates) {
    try {
      const tournament = await Tournament.findById(tournamentId);
      if (!tournament) continue;

      const reg = await MatchRegistration.findOneAndUpdate(
        { tournamentId, username },
        { kills: parseInt(kills) || 0, moneyEarned: parseFloat(moneyEarned) || 0 },
        { new: true }
      );
      if (!reg) continue;

      const user = await User.findOne({ uname: username });
      if (user) {
        user.winningMoney = (user.winningMoney || 0) + parseFloat(moneyEarned);
        await user.save();
        await Transaction.create({
          username,
          type: 'Winning Amount',
          amount: parseFloat(moneyEarned),
          status: 'Success',
          note: `Bulk update - Tournament ${tournament.tournamentId}`
        });
      }

      updated++;
      affectedTournaments.add(tournamentId);

    } catch (err) {
      console.error(`Update failed for ${username} in ${tournamentId}:`, err);
    }
  }

  for (const tid of affectedTournaments) {
    try {
      const tournament = await Tournament.findById(tid);
      const players = await MatchRegistration.find({ tournamentId: tid }).sort({ kills: -1, moneyEarned: -1 });
      if (players.length > 0) {
        tournament.mvp = {
          username: players[0].username,
          kills: players[0].kills,
          moneyEarned: players[0].moneyEarned,
        };
        await tournament.save();
      }
    } catch (e) {
      console.error(`MVP update error for tournament ${tid}:`, e);
    }
  }

  res.json({ success: true, updated, affectedTournaments: [...affectedTournaments] });
};

// ✅ Basic tournament stats
exports.getTournamentStats = async (req, res) => {
  try {
    const stats = {
      totalTournaments: await Tournament.countDocuments(),
      totalRegistrations: await MatchRegistration.countDocuments(),
      activeTournaments: await Tournament.countDocuments({ status: 'Ongoing' }),
      upcomingTournaments: await Tournament.countDocuments({ status: 'Upcoming' }),
      completedTournaments: await Tournament.countDocuments({ status: 'Completed' }),
    };
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
};
