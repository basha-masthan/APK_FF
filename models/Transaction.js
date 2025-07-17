const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  username: { type: String, required: true },
  type: { type: String, enum: ['Deposit', 'Withdraw', 'Entry Fee'], required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['Success', 'Pending', 'Rejected'], default: 'Pending' },
  note: { type: String },

  // 🔁 For Razorpay Payment Link tracking
  razorpay_payment_link_id: { type: String },
  razorpay_payment_id: { type: String },
  razorpay_signature: { type: String },

  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);
