const express = require('express');
const router = express.Router();
const Tournament = require('../models/Tournament');
const Game = require('../models/games');
const requireLogin = require('../middleware/requireLogin');
// const tournamentController = require('../controllers/tournamentController');




router.post('/adds', async (req, res) => {
  const { gameName, gameImg } = req.body;

  if (!gameName || !gameImg) {
    return res.status(400).send('Game name and image URL are required.');
  }

  try {
    const existing = await Game.findOne({ gameName });
    if (existing) {
      return res.status(400).send('Game already exists.');
    }

    const newGame = new Game({ gameName, gameImg });
    await newGame.save();
    res.redirect('/games.html');
  } catch (err) {
    res.status(500).send(`Error creating game: ${err.message}`);
  }
});


// Fetch all games for admin
router.get('/AllGames',  async (req, res) => {
  try {
    const games = await Game.find().sort({ name: 1 });
    res.json(games);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// PATCH /games/:id - update game
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { gameName, gameImg } = req.body;
  try {
    await Game.findByIdAndUpdate(id, { gameName, gameImg });
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Game update error:", err);
    res.status(500).json({ success: false });
  }
});

// DELETE /games/:id - delete game
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await Game.findByIdAndDelete(id);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Game delete error:", err);
    res.status(500).json({ success: false });
  }
});




module.exports = router;
