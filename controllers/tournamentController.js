const Tournament = require('../models/Tournament');

// Generate a 6-digit ID
function generate6DigitId() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Ensure unique tournamentId
async function generateUniqueTournamentId() {
  let unique = false;
  let id;

  while (!unique) {
    id = generate6DigitId();
    const existing = await Tournament.findOne({ tournamentId: id });
    if (!existing) unique = true;
  }

  return id;
}

// ✅ Get tournaments (optionally filtered by game)
exports.getTournaments = async (req, res) => {
  const { game } = req.query;

  try {
    const query = game ? { 'game.name': game } : {};
    const tournaments = await Tournament.find(query);
    res.json(tournaments);
  } catch (err) {
    console.error("Fetch tournaments error:", err);
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
};

// ✅ Create a tournament with unique ID
exports.createTournament = async (req, res) => {
  const {
    gameName,
    gameLogo,
    gameMode,
    mapName,
    totalSlots,
    availableSlots,
    entryFee,
    perKillReward,
    prizeMoney,
    startTime
  } = req.body;

  try {
    const tournamentId = await generateUniqueTournamentId();

    const newTournament = new Tournament({
      tournamentId,
      game: {
        name: gameName,
        logo: gameLogo,
        mode: gameMode
      },
      mapName,
      entryFee: parseInt(entryFee),
      perKillReward: parseInt(perKillReward),
      prizeMoney: parseInt(prizeMoney),
      totalSlots: parseInt(totalSlots),
      availableSlots: parseInt(availableSlots),
      startTime: new Date(startTime),
      status: 'Upcoming'
    });

    await newTournament.save();
    res.redirect('/admin/dashboard.html');
  } catch (err) {
    console.error("Create tournament error:", err);
    res.status(400).send(
      `<h2 style="color:red;text-align:center;">❌ Error: ${err.message}</h2><a href="/tournaments/create">Try again</a>`
    );
  }
};

// ✅ Patch/update a tournament
exports.updateTournament = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    await Tournament.findByIdAndUpdate(id, updates);
    res.sendStatus(200);
  } catch (err) {
    console.error("Update tournament error:", err);
    res.status(500).json({ error: "Failed to update tournament" });
  }
};

// ✅ Delete tournament
exports.deleteTournament = async (req, res) => {
  const { id } = req.params;

  try {
    await Tournament.findByIdAndDelete(id);
    res.sendStatus(200);
  } catch (err) {
    console.error("Delete tournament error:", err);
    res.status(500).json({ error: "Failed to delete tournament" });
  }
};

               //                               \\
              // ✅ Admin dashboard statistics   \\
             //                                   \\


exports.tournamentCompleteUpdate = async (req, res) => {
  const { tournamentId, updates } = req.body;

  if (!updates || !Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid updates array' 
    });
  }

  try {
    console.log(`🎯 Processing tournament completion for ${tournamentId} with ${updates.length} updates...`);
    
    // Find tournament by MongoDB ObjectId
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      console.log(`❌ Tournament not found: ${tournamentId}`);
      return res.status(404).json({ success: false, error: 'Tournament not found' });
    }

    let updatedCount = 0;
    let failedUpdates = [];
    let totalMoneyDistributed = 0;

    // Process player updates
    for (const update of updates) {
      const { username, kills, moneyEarned } = update;

      try {
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
          failedUpdates.push({ username, error: 'Registration not found' });
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
            type: 'Tournament Completion',
            amount: parseFloat(moneyEarned),
            status: 'Success',
            note: `Tournament ${tournament.tournamentId} completed - ${kills} kills`,
          });

          totalMoneyDistributed += parseFloat(moneyEarned);
        }

        updatedCount++;

      } catch (updateError) {
        console.error(`❌ Individual update error for ${username}:`, updateError);
        failedUpdates.push({ username, error: updateError.message });
      }
    }

    // ✅ NEW: Update tournament status to Completed
    tournament.status = 'Completed';

    // ✅ NEW: Update assignment badge and count
    tournament.updateAssignmentBadge();
    tournament.addAssignmentHistory(updatedCount, 'Admin'); // You can pass actual admin username if available

    // Update MVP for this tournament
    try {
      const allRegistrations = await MatchRegistration.find({ 
        tournamentId: tournament._id 
      }).sort({ kills: -1, moneyEarned: -1 });

      if (allRegistrations.length > 0) {
        const topPlayer = allRegistrations[0];
        tournament.mvp = {
          username: topPlayer.username,
          kills: topPlayer.kills,
          moneyEarned: topPlayer.moneyEarned,
        };
        console.log(`🏅 Updated MVP: ${topPlayer.username} with ${topPlayer.kills} kills`);
      }
    } catch (mvpError) {
      console.error(`❌ MVP update error:`, mvpError);
    }

    // Save tournament with all updates
    await tournament.save();

    // ✅ NEW: Generate badge message
    let badgeMessage = '';
    switch(tournament.assignmentBadge) {
      case 'assigned':
        badgeMessage = 'Badge: Assigned Successfully ✅';
        break;
      case 'multiple':
        badgeMessage = `Badge: Multiple Assignment (${tournament.assignmentCount} times) 🔄`;
        break;
      default:
        badgeMessage = 'Badge: Assignment Error ❌';
    }

    const response = {
      success: true,
      updatedCount,
      tournamentStatus: tournament.status,
      assignmentBadge: tournament.assignmentBadge,
      assignmentCount: tournament.assignmentCount,
      badgeMessage,
      totalMoneyDistributed,
      mvp: tournament.mvp,
      failedUpdates: failedUpdates.length > 0 ? failedUpdates : undefined,
      message: `Tournament ${tournament.tournamentId} completed successfully. ${badgeMessage}`
    };

    console.log(`🎉 Tournament completion response:`, response);
    res.json(response);

  } catch (err) {
    console.error('🚨 Tournament completion error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      message: err.message
    });
  }
};
