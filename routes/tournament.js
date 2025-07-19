const express = require('express');
const router = express.Router();
const Tournament = require('../models/Tournament');
const Game = require('../models/games');
const requireLogin = require('../middleware/requireLogin');
const tournamentController = require('../controllers/tournamentController');




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



// get tournaments
// GET /tournaments?game=Free%20Fire
router.get('/',  async (req, res) => {
  const { game } = req.query;

  try {
    let query = {};
    if (game) {
      query['game.name'] = game; // 👈 nested field
    }

    const tournaments = await Tournament.find(query);
    res.json(tournaments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});



function generate6DigitId() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Ensures uniqueness of tournamentId

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

router.post('/create', async (req, res) => {
  const {
    gameName,     // e.g. "Free Fire"
    gameLogo,     // e.g. "/images/freefire.png"
    gameMode,     // e.g. "Solo", "Duo", "Squad"
    mapName,      // 🆕 New field
    totalSlots,
    availableSlots,
    entryFee,
    perKillReward,
    prizeMoney,
    startTime     // ISO 8601 string or valid Date
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
      mapName, // 🆕 Include map name
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
    res.status(400).send(
      `<h2 style="color:red;text-align:center;">❌ Error: ${err.message}</h2><a href="/tournaments/create">Try again</a>`
    );
  }
});


router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  await Tournament.findByIdAndUpdate(id, updates);
  res.sendStatus(200);
});

// Delete tournament
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  await Tournament.findByIdAndDelete(id);
  res.sendStatus(200);
});


module.exports = router;
