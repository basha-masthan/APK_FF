// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  uname: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  balance: { type: Number, default: 0 } ,
  winningMoney: { type: Number, default: 0 },
}, {
  timestamps: true
});

// ✅ Correct export
const User = mongoose.model('User', userSchema);
module.exports = User;


