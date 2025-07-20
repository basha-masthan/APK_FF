const MatchRegistration = require('../models/MatchRegistration');
const Tournament = require('../models/Tournament');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// ✅ GET all match registrations grouped by tournament - FIXED VERSION
exports.getMatchRegistrations = async (req, res) => {
  try {
    console.log('🔍 Fetching match registrations...');
    
    const registrations = await MatchRegistration.find().populate('tournamentId').lean();
    console.log(`📊 Found ${registrations.length} registrations`);
    
    // Debug: Check populate results
    registrations.forEach((reg, index) => {
      if (!reg.tournamentId) {
        console.log(`⚠️ Registration ${index} has null tournamentId:`, reg._id);
      } else {
        console.log(`✅ Registration ${index} populated: Tournament ${reg.tournamentId.tournamentId}`);
      }
    });

    const grouped = {};

    for (const reg of registrations) {
      const tid = reg.tournamentId?._id?.toString();
      if (!tid || !reg.tournamentId) {
        console.log('⚠️ Skipping invalid registration:', reg._id);
        continue;
      }

      if (!grouped[tid]) {
        // ✅ FIXED: Use startTime instead of non-existent date field
        grouped[tid] = {
          tournament: {
            dbId: reg.tournamentId._id,
            tournamentId: reg.tournamentId.tournamentId,
            totalSlots: reg.tournamentId.totalSlots,
            availableSlots: reg.tournamentId.availableSlots,
            perKillReward: reg.tournamentId.perKillReward,
            entryFee: reg.tournamentId.entryFee, // ✅ Added missing field
            prizeMoney: reg.tournamentId.prizeMoney, // ✅ Added missing field
            date: reg.tournamentId.startTime, // ✅ Fixed: Use startTime
            startTime: reg.tournamentId.startTime, // ✅ Include both for compatibility
            status: reg.tournamentId.status, // ✅ Added status field
            game: reg.tournamentId.game, // ✅ Added game info
            mapName: reg.tournamentId.mapName, // ✅ Added map name
          },
          players: [],
        };
        console.log(`📝 Created group for tournament: ${reg.tournamentId.tournamentId}`);
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

    console.log(`✅ Sending ${Object.keys(grouped).length} tournaments with registrations`);
    
    // Additional debug info
    Object.keys(grouped).forEach(tid => {
      const tournament = grouped[tid];
      console.log(`🏆 Tournament ${tournament.tournament.tournamentId}: ${tournament.players.length} players`);
    });

    res.json({ success: true, data: grouped });
  } catch (err) {
    console.error('🚨 getMatchRegistrations error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'server-error', 
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// ✅ PUT update match registration kills and moneyEarned - ENHANCED VERSION
exports.updateMatchRegistration = async (req, res) => {
  const { tournamentId, username } = req.params;
  const { kills, moneyEarned } = req.body;

  try {
    console.log(`🔄 Updating match registration: ${username} in tournament ${tournamentId}`);
    console.log(`📊 New stats: ${kills} kills, ₹${moneyEarned} earned`);

    // Find tournament by MongoDB ObjectId
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      console.log(`❌ Tournament not found: ${tournamentId}`);
      return res.status(404).json({ success: false, error: 'Tournament not found' });
    }

    // Update the match registration
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
      console.log(`❌ Match registration not found: ${username} in ${tournamentId}`);
      return res.status(404).json({ success: false, error: 'Match registration not found' });
    }

    console.log(`✅ Updated registration:`, registration);

    // Update user's total winning money and create transaction
    const user = await User.findOne({ uname: username });
    if (user) {
      const oldWinnings = user.winningMoney || 0;
      user.winningMoney = oldWinnings + parseFloat(moneyEarned);
      await user.save();

      console.log(`💰 Updated user ${username} winnings: ₹${oldWinnings} → ₹${user.winningMoney}`);

      // Create transaction record
      const transaction = await Transaction.create({
        username,
        type: 'Winning Amount',
        amount: parseFloat(moneyEarned),
        status: 'Success',
        note: `Winnings from tournament ${tournament.tournamentId} - ${kills} kills`,
      });

      console.log(`📝 Created transaction:`, transaction._id);
    } else {
      console.log(`⚠️ User not found: ${username}`);
    }

    // Check if this player should be MVP (most kills or highest earnings)
    const allRegistrations = await MatchRegistration.find({ tournamentId: tournament._id });
    const topKiller = allRegistrations.reduce((prev, curr) => 
      (curr.kills || 0) > (prev.kills || 0) ? curr : prev
    );

    // Update tournament MVP if this player has the most kills
    if (registration.username === topKiller.username) {
      tournament.mvp = {
        username: registration.username,
        kills: registration.kills,
        moneyEarned: registration.moneyEarned,
      };
      await tournament.save();
      console.log(`🏅 Updated MVP: ${registration.username}`);
    }

    res.json({ 
      success: true, 
      data: registration,
      mvp: tournament.mvp,
      userUpdated: !!user
    });
  } catch (err) {
    console.error('🚨 Match update error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      message: err.message
    });
  }
};

// ✅ Additional helper function to get tournament statistics
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
    console.error('Stats error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
};

// ✅ NEW: Bulk update multiple match registrations
exports.bulkUpdateMatchRegistrations = async (req, res) => {
  const { updates } = req.body;

  if (!updates || !Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid updates array' 
    });
  }

  try {
    console.log(`🚀 Processing bulk update for ${updates.length} players...`);
    
    let updatedCount = 0;
    let failedUpdates = [];
    const affectedTournaments = new Set();
    const tournamentMVPs = new Map();

    // Process each update
    for (const update of updates) {
      const { tournamentId, username, kills, moneyEarned } = update;

      try {
        // Find tournament by MongoDB ObjectId
        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) {
          console.log(`❌ Tournament not found: ${tournamentId}`);
          failedUpdates.push({ username, tournamentId, error: 'Tournament not found' });
          continue;
        }

        // Update the match registration
        const registration = await MatchRegistration.findOneAndUpdate(
          { tournamentId: tournament._id, username },
          {
            $set: {
              kills: parseInt(kills) || 0,
              moneyEarned: parseFloat(moneyEarned) || 0,
            },
          },
          { new: true }
        );

        if (!registration) {
          console.log(`❌ Registration not found: ${username} in ${tournamentId}`);
          failedUpdates.push({ username, tournamentId, error: 'Registration not found' });
          continue;
        }

        console.log(`✅ Updated ${username}: ${kills} kills, ₹${moneyEarned}`);

        // Update user's winning money and create transaction
        const user = await User.findOne({ uname: username });
        if (user) {
          user.winningMoney = (user.winningMoney || 0) + parseFloat(moneyEarned);
          await user.save();

          // Create transaction record
          await Transaction.create({
            username,
            type: 'Winning Amount',
            amount: parseFloat(moneyEarned),
            status: 'Success',
            note: `Bulk update - Tournament ${tournament.tournamentId} - ${kills} kills`,
          });
        }

        affectedTournaments.add(tournament._id.toString());
        updatedCount++;

        // Track potential MVP for this tournament
        if (!tournamentMVPs.has(tournament._id.toString())) {
          tournamentMVPs.set(tournament._id.toString(), {
            tournament,
            bestPlayer: { username, kills: parseInt(kills) || 0, moneyEarned: parseFloat(moneyEarned) || 0 }
          });
        } else {
          const current = tournamentMVPs.get(tournament._id.toString());
          if ((parseInt(kills) || 0) > current.bestPlayer.kills) {
            current.bestPlayer = { username, kills: parseInt(kills) || 0, moneyEarned: parseFloat(moneyEarned) || 0 };
          }
        }

      } catch (updateError) {
        console.error(`❌ Individual update error for ${username}:`, updateError);
        failedUpdates.push({ username, tournamentId, error: updateError.message });
      }
    }

    // Update MVPs for affected tournaments
    for (const [tournamentId, mvpData] of tournamentMVPs) {
      try {
        // Get all registrations for this tournament to find the actual top performer
        const allRegistrations = await MatchRegistration.find({ 
          tournamentId: mvpData.tournament._id 
        }).sort({ kills: -1, moneyEarned: -1 });

        if (allRegistrations.length > 0) {
          const topPlayer = allRegistrations[0];
          mvpData.tournament.mvp = {
            username: topPlayer.username,
            kills: topPlayer.kills,
            moneyEarned: topPlayer.moneyEarned,
          };
          await mvpData.tournament.save();
          console.log(`🏅 Updated MVP for tournament ${mvpData.tournament.tournamentId}: ${topPlayer.username}`);
        }
      } catch (mvpError) {
        console.error(`❌ MVP update error for tournament ${tournamentId}:`, mvpError);
      }
    }

    const response = {
      success: true,
      updatedCount,
      tournamentsAffected: affectedTournaments.size,
      totalRequested: updates.length,
      failedUpdates: failedUpdates.length > 0 ? failedUpdates : undefined,
      message: `Successfully updated ${updatedCount} out of ${updates.length} players across ${affectedTournaments.size} tournaments`
    };

    console.log(`🎉 Bulk update completed:`, response);
    res.json(response);

  } catch (err) {
    console.error('🚨 Bulk update error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      message: err.message
    });
  }
};
