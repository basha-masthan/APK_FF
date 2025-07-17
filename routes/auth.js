import express from 'express';
import { sendOTP } from '../services/emailService.js';
import User from '../models/User.js';

const router = express.Router();

router.post('/send-otp', async (req, res) => {
  const { uname, email, password } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP

  req.session.tempUser = { uname, email, password };
  req.session.otp = otp;

  await sendOTP(email, otp);
  res.redirect('/verify-otp.html');
});

router.post('/verify-otp', async (req, res) => {
  const { otp } = req.body;

  if (parseInt(otp) === req.session.otp) {
    const { uname, email, password } = req.session.tempUser;

    const newUser = new User({ uname, email, password });
    await newUser.save();

    req.session.user = {
      id: newUser._id,
      uname,
      email
    };

    delete req.session.otp;
    delete req.session.tempUser;

    res.redirect('/tournament.html');
  } else {
    res.send('<p>❌ Invalid OTP. <a href="/verify-otp.html">Try again</a></p>');
  }
});

export default router;
