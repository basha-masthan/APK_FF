const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const session = require('express-session');
const path = require('path');
const Razorpay = require('razorpay');
const morgan = require('morgan');
const requireLogin = require('./middleware/requireLogin');
const MongoStore = require('connect-mongo');
const resolveUserId = require('./middleware/resolveUserId');

dotenv.config();
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(morgan('dev')); // You can also use 'combined' for more details

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
}));


// ✅ Serve static public files (like login form)
app.use(express.static(path.join(__dirname, 'public')));

// ✅ MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});



app.get('/', requireLogin,  (req, res) => {
  res.sendFile(path.join(__dirname, '/index.html'));
});


app.get('/Games/ff', requireLogin,  (req, res) => {
  res.sendFile(path.join(__dirname, 'Games/ff.html'));
});


app.post('/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    req.session.admin = true;
    res.status(200).json({ success: true, redirect: "/admin/dashboard.html" });
  } else {
    res.send('<p>❌ Invalid credentials. <a href="/admin.html">Try again</a></p>');
  }
});


const userRoutes = require('./routes/userRoutes');
app.use('/users',  userRoutes);

app.post('/users/login', async (req, res) => {
  const { uname, password } = req.body;

  const user = await User.findOne({ uname });
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  if (res.ok) {
  localStorage.setItem('isLoggedIn', 'true');
  window.location.href = "/games.html";
}

  req.session.user = {
    id: user._id,
    uname: user.uname,
    email: user.email,
    role: user.role
  };

  res.json({ success: true }); // ✅ JSON response
});



const supportRoutes = require('./routes/support');
app.use('/support', supportRoutes);


const adminStatsRoutes = require('./routes/adminStats');
app.use('/admin', adminStatsRoutes);


const tournamentRoutes = require('./routes/tournament');
app.use('/games', tournamentRoutes);

app.get('/games/mygames', requireLogin,  async (req, res) => {
  try {
    const games = await Game.find().sort({ name: 1 });
    res.json(games);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});



app.get('/session-info', (req, res) => {
  if (req.session.user) {
    return res.json({ uname: req.session.user.uname });
  } else {
    return res.status(401).json({ error: 'Unauthorized' });
  }
});

const walletRoutes = require('./routes/wallet');
app.use('/wallet', walletRoutes);

const notification = require('./routes/notifications');
app.use('/not',notification)


const bookingMatchesRoute = require('./routes/Booking_Matches');
app.use('/Match', bookingMatchesRoute);

const attachNotificationCount = require('./middleware/notifications');
app.use(attachNotificationCount);


const ocrRoutes = require('./routes/ocr'); 
app.use('/ocr', ocrRoutes);




const PORT = process.env.PORT || 5555;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
