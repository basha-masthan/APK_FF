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
const webpush = require('web-push');
const bodyParser = require('body-parser');
const admin = require("./firebaseAdmin");

const nodemailer = require('nodemailer');
const crypto = require('crypto');

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

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // true for port 465, false for 587
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASS
  }
});


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

app.get('/admin/ok', (req, res) =>{
    return res.redirect('./login.html');
});



app.post('/admin/login', (req, res) => {
  const { email, password } = req.body;

  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    // Generate a 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    
    // Save OTP in session (valid for 5 min)
    req.session.otp = otp;
    req.session.otpExpiry = Date.now() + 5 * 60 * 1000;

    // Send email
    transporter.sendMail({
      from: `"Admin Security" <${process.env.SMTP_EMAIL}>`,
      to: "winzonearenaofficial@gmail.com",
      subject: "Your Admin Login OTP",
      text: `Your OTP for admin login is: ${otp}. This OTP will expire in 5 minutes.`
    }, (err, info) => {
      if (err) {
        console.error("Error sending OTP:", err);
        return res.status(500).send("Failed to send OTP");
      }
      res.status(200).json({ success: true, step: "otp" });
    });

  } else {
    res.send('<p>❌ Invalid credentials. <a href="/admin.html">Try again</a></p>');
  }
});

// Step 2: Verify OTP
app.post('/admin/verify-otp', (req, res) => {
  const { otp } = req.body;

  if (!req.session.otp || Date.now() > req.session.otpExpiry) {
  delete req.session.otp;
  delete req.session.otpExpiry;
  return res.status(400).json({ success: false, message: "OTP expired. Please login again." });
}

  if (otp === req.session.otp) {
    req.session.admin = true;
    delete req.session.otp;
    delete req.session.otpExpiry;
    res.status(200).json({ success: true, redirect: "/admin/dashboard.html" });
  } else {
    res.status(400).send("Invalid OTP. Please try again.");
  }
});




let pending = {}; // Store verification state

// Truecaller callback after verification
app.post('/truecaller-callback', async (req, res) => {
  const { requestId, accessToken, endpoint } = req.body;

  try {
    const profileResp = await fetch(endpoint, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const profile = await profileResp.json();

    // Save user as verified
    pending[requestId] = { verified: true, profile };

    res.json({ status: 'ok' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Profile fetch failed' });
  }
});

// Polling status
app.get('/verify-status/:nonce', (req, res) => {
  const status = pending[req.params.nonce];
  if (status) {
    res.json(status);
  } else {
    res.status(404).json({ verified: false });
  }
});

// Fallback SMS sending
app.post('/send-fallback-sms/:nonce', (req, res) => {
  const nonce = req.params.nonce;

  // TODO: integrate SMS provider like Twilio or MSG91 here
  console.log(`Sending SMS to user for nonce ${nonce}`);

  pending[nonce] = { verified: false, smsSent: true };
  res.json({ status: 'sms_sent' });
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

  // basha
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


app.post('/save-subscription', async (req, res) => {
  const uname = req.session?.user?.uname;
  if (!uname) return res.status(401).json({ error: 'Unauthorized' });

  const subscription = req.body;
  await db.collection('pushSubs').updateOne(
    { uname },
    { $set: { subscription } },
    { upsert: true }
  );
  res.json({ ok: true });
});

const publicVapidKey = 'BBbzsqDnOXvw8_uKX-yc7N3EkLPqvqoNkrW2y8rFKsbcGT5iF0iL3pJwLfXwdLKIMdwGUhz1Ath-U_ZDuppSm5w';
const privateVapidKey = 'muGzuAxIAg3V12eOIJweE0_bwIkN8-x5-UcSYiJQaE0';
webpush.setVapidDetails(
  'mailto:test@example.com',
  publicVapidKey,
  privateVapidKey
);

app.post('/save-subscription', async (req, res) => {
  const { uname, subscription } = req.body;
  if (!uname || !subscription) return res.status(400).send('Missing data');

  await PushSub.updateOne(
    { uname, 'subscription.endpoint': subscription.endpoint },
    { uname, subscription },
    { upsert: true }
  );

  res.sendStatus(201);
});

const PushSub = require('./models/PushSub'); // import model if in separate file





const PORT = process.env.PORT || 5555;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
