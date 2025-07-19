const Tournament = require('../models/Tournament');
const MatchRegistration = require('../models/MatchRegistration');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

exports.markTournamentComplete = async (req, res) => {
  const { id } = req.params;

  try {
    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ success: false, error: 'Tournament not found' });
    }

    // 1. Update tournament status
    tournament.status = 'Completed';
    await tournament.save();

    // 2. (Optional) Distribute prizes if there's a prize pool
    // This is a placeholder for more complex logic.
    // For now, we'll just mark it as complete.

    res.json({ success: true, message: 'Tournament marked as completed.' });
  } catch (err) {
    console.error('Error marking tournament complete:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
