const Tournament = require('../models/Tournament');

exports.getAllTournaments = async (req, res) => {
  try {
    const tournaments = await Tournament.find();
    res.json(tournaments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
};

exports.createTournament = async (req, res) => {
  try {
    const newTournament = new Tournament(req.body);
    await newTournament.save();
    res.status(201).json({ success: true, tournament: newTournament });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create tournament' });
  }
};

exports.updateTournament = async (req, res) => {
  try {
    const updated = await Tournament.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Tournament not found' });
    }
    res.json({ success: true, tournament: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update tournament' });
  }
};

exports.deleteTournament = async (req, res) => {
  try {
    const deleted = await Tournament.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Tournament not found' });
    }
    res.json({ success: true, message: 'Tournament deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete tournament' });
  }
};
