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

// GET /users/profile
router.get('/profile', requireLogin, async (req, res) => {
  try {
    const username = req.session.user?.uname;
    if (!username) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Fetch full user info excluding password for security
    const user = await User.findOne({ uname: username }).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // You can also fetch related data (e.g., registered tournaments) if needed
    
    res.json({
      success: true,
      user: {
        uname: user.uname,
        email: user.email,
        balance: user.balance,
        winningMoney: user.winningMoney,
        notificationSettings: user.notificationSettings,
        // ...add more fields as desired
      }
    });
  } catch (err) {
    console.error('Error in /profile:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});



// PUT /users/edit-profile
router.put('/edit-profile', requireLogin, async (req, res) => {
  try {
    const username = req.session.user?.uname;
    if (!username) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { uname, email, password } = req.body;

    // Prepare update object
    let updateData = { uname, email }; // You can add more fields as required

    // If password is provided, hash it before updating
    if (password) {
      const bcrypt = require('bcryptjs');
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      updateData.password = hashedPassword;
    }

    // Update user by current username (session user)
    const updatedUser = await User.findOneAndUpdate(
      { uname: username },
      updateData,
      { new: true, runValidators: true } // Return updated doc, validate input
    ).select('-password'); // Exclude password from response

    if (!updatedUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Update session user info if username changed
    if (uname && uname !== username) {
      req.session.user.uname = uname;
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        uname: updatedUser.uname,
        email: updatedUser.email,
        balance: updatedUser.balance,
        winningMoney: updatedUser.winningMoney,
        notificationSettings: updatedUser.notificationSettings,
      }
    });
  } catch (err) {
    console.error('Error in /edit-profile:', err);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
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
  req.session.destroy(() => {
    res.clearCookie('connect.sid'); // Name may vary
    res.redirect('/login.html');   // Or send JSON if using AJAX
  });
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
