const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const session = require('express-session');
const path = require('path');
const Razorpay = require('razorpay');
const morgan = require('morgan');
const requireLogin = require('./middleware/requireLogin');

dotenv.config();
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(morgan('dev')); // You can also use 'combined' for more details


app.use(session({
  secret: 'supersecretkey', // change this in production!
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // true only if HTTPS
}));


// ✅ Serve static public files (like login form)
app.use(express.static(path.join(__dirname, 'public')));

// ✅ MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));





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
app.use('/users', userRoutes);

app.post('/users/login', async (req, res) => {
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





const adminStatsRoutes = require('./routes/adminStats');
app.use('/admin', adminStatsRoutes);


const tournamentRoutes = require('./routes/tournament');
app.use('/tournaments', tournamentRoutes);

app.get('/session-info', (req, res) => {
  if (req.session.user) {
    return res.json({ uname: req.session.user.uname });
  } else {
    return res.status(401).json({ error: 'Unauthorized' });
  }
});

const walletRoutes = require('./routes/wallet');
app.use('/wallet', walletRoutes);


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// const resultsRoute = require('./routes/results');
// app.use('/results', resultsRoute);


const bookingMatchesRoute = require('./routes/Booking_Matches');
app.use('/Match', bookingMatchesRoute);



const PORT = process.env.PORT || 5555;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
