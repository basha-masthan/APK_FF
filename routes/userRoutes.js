const express = require('express');
const router = express.Router();
const requireLogin = require('../middleware/requireLogin');
const User = require('../models/User');
// tournaments moddel
const Tournament = require('../models/Tournament');
const Game = require('../models/games');
// const bcrypt = require('bcryptjs');

// ✅ GET all users (admin only)
router.get('/', async (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const users = await User.find();
  res.json(users);
});



// ✅ POST new user (register and create session)
router.post('/', async (req, res) => {
  try {
    const { uname, email, password } = req.body;

    // 🔍 Check if username already exists
    const existingUsername = await User.findOne({ uname });
    if (existingUsername) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    // 🔍 Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    // ✅ Create and save the new user
    const newUser = new User({ uname, email, password });
    await newUser.save();

    // ✅ Set session
    req.session.user = {
      id: newUser._id,
      uname: newUser.uname,
      email: newUser.email,
      role: newUser.role  // assuming you store role in User model
    };

    // ✅ Redirect to tournament
    res.redirect('/tournaments.html');
  } catch (err) {
    console.error('Error during registration:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.put('/edit-profile', requireLogin, async (req, res) => {
  const { uname, email, password } = req.body;
  const username = req.session.user?.uname;

  try {
    const updateData = { uname, email };
    if (password) updateData.password = password;

    const updated = await User.findOneAndUpdate({ uname: username }, updateData, { new: true });
    if (!updated) return res.status(404).json({ error: 'User not found' });

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});


// ✅ PUT update user
router.put('/:id', async (req, res) => {
  const { uname, email, password, balance, winningMoney } = req.body;

  try {
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      {
        uname,
        email,
        password,
        balance: parseFloat(balance) || 0,
        winningMoney: parseFloat(winningMoney) || 0
      },
      { new: true }
    );

    res.json({ success: true, user: updated });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ success: false, error: 'Update failed' });
  }
});


// ✅ DELETE user
router.delete('/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});



// login user
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  req.session.user = {
    id: user._id,
    uname: user.uname,
    email: user.email,
    role: user.role
  };

  res.json({ success: true }); // ✅ JSON response
});


router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.redirect('/login.html'); // or your landing page
  });
});


router.get('/profile', requireLogin, async (req, res) => {
  try {
    const username = req.session.user?.uname;
    const registered = await MatchRegistration.find({ username }).select('tournamentId');
    const ids = registered.map(r => r.tournamentId.toString());
    res.json({ success: true, tournamentIds: ids });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.get('/tournaments', requireLogin, async (req, res) => {
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

router.get('/AllGames', requireLogin, async (req, res) => {
  try {
    const games = await Game.find().sort({ name: 1 });
    res.json(games);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});



module.exports = router;
