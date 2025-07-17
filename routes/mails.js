const express = require('express');
const router = express.Router();
const requireLogin = require('../middleware/requireLogin');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// 🔐 Reset Password Route
router.post('/reset-password', async (req, res) => {
  const { email } = req.body;

  // Generate a 6-character temp password
  const tempPassword = crypto.randomBytes(4).toString('base64').slice(0, 6);

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Update user's password to temporary one
    user.password = tempPassword;
    await user.save();

    // Setup Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'your@gmail.com',            // your Gmail
        pass: 'your_app_password'          // Gmail App Password
      }
    });

    const mailOptions = {
      from: '"Game Adudham" <your@gmail.com>',
      to: user.email,
      subject: '🔐 Temporary Password for Reset',
      html: `
        <h3>Hi ${user.uname},</h3>
        <p>You've requested to reset your password. Use the temporary password below to log in and change it immediately:</p>
        <p><b>${tempPassword}</b></p>
        <p>If you did not request this, please ignore this email.</p>
        <br><p>– Team Game Adudham</p>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Temporary password sent via email.' });

  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



module.exports = router;
