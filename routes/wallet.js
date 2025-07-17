const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const requireLogin = require('../middleware/requireLogin');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const withdraw = require('../models/withdraw');
const MatchRegistration = require('../models/MatchRegistration');
const dotenv = require('dotenv');
dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

router.post('/deposit', requireLogin, async (req, res) => {
  const { amount } = req.body;
  const username = req.session.user?.uname;

  try {
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const transaction = await Transaction.create({
      username,
      type: 'Deposit',
      amount,
      status: 'Pending'
    });
    res.json({ transactionId: transaction._id });
  } catch (err) {
    res.status(500).json({ error: 'Error creating transaction' });
  }
});

router.post('/razorpay/order', requireLogin, async (req, res) => {
  const { amount } = req.body;

  try {
    const amt = Math.round(parseFloat(amount) * 100);

    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const order = await razorpay.orders.create({
      amount: amt,
      currency: 'INR',
      receipt: `txn_${Date.now()}`,
      payment_capture: 1
    });

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create Razorpay order' });
  }
});

router.post('/deposit/success', requireLogin, async (req, res) => {
  const { transactionId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

  try {
    const txn = await Transaction.findById(transactionId);
    if (!txn || txn.status === 'Success') {
      return res.status(400).json({ error: 'Invalid or already completed transaction' });
    }

    const bodyData = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(bodyData)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(403).json({ error: 'Signature verification failed' });
    }

    txn.status = 'Success';
    txn.razorpay_payment_id = razorpay_payment_id;
    txn.razorpay_order_id = razorpay_order_id;
    txn.razorpay_signature = razorpay_signature;
    await txn.save();

    await User.findOneAndUpdate(
      { uname: txn.username },
      { $inc: { balance: txn.amount } }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Deposit confirmation failed' });
  }
});

router.get('/balance', requireLogin, async (req, res) => {
  const username = req.session.user?.uname;
  try {
    const user = await User.findOne({ uname: username });
    res.json({ balance: user?.balance || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch wallet balance' });
  }
});

router.get('/transactions', requireLogin, async (req, res) => {
  const username = req.session.user.uname;

  try {
    const transactions = await Transaction.find({ username }).sort({ createdAt: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

router.get('/balance/total', requireLogin, async (req, res) => {
  const username = req.session.user?.uname;
  if (!username) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const user = await User.findOne({ uname: username });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const total = (user.balance || 0) + (user.winningMoney || 0);
    res.json({
      balance: user.balance || 0,
      winningMoney: user.winningMoney || 0,
      total
    });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching balance' });
  }
});




router.post('/withdraw', requireLogin, async (req, res) => {
  const { upiId, amount } = req.body;
  const username = req.session.user?.uname;

  try {
    if (!upiId || !upiId.includes('@')) {
      return res.status(400).json({ error: "Invalid UPI ID" });
    }

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const user = await User.findOne({ uname: username });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const currentWinning = user.winningMoney || 0;
    console.log(`[Withdraw] ${username} - Current winningMoney: ₹${currentWinning}, Requested: ₹${parsedAmount}`);

    if (currentWinning < parsedAmount) {
      return res.status(400).json({ error: "Insufficient winning balance" });
    }

    // Deduct balance first to prevent double withdrawal
    user.winningMoney -= parsedAmount;
    await user.save();

    // Store withdraw request
    await withdraw.create({
      username,
      upiId,
      amount: parsedAmount
    });

    // Store matching pending transaction
    await Transaction.create({
      username,
      type: 'Withdraw',
      amount: parsedAmount,
      status: 'Pending'
    });

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Withdraw error:", err);
    res.status(500).json({ error: "Server error during withdraw" });
  }
});



module.exports = router;
