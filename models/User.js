// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  uname: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  balance: { type: Number, default: 0 } ,
  winningMoney: { type: Number, default: 0 },
  
   fcmTokens: [{
    token: { type: String, required: true },
    device: { type: String, enum: ['web', 'android', 'ios'], default: 'web' },
    createdAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
  }],
  
  // ✅ NEW: Notification preferences
  notificationSettings: {
    tournamentUpdates: { type: Boolean, default: true },
    matchResults: { type: Boolean, default: true },
    paymentNotifications: { type: Boolean, default: true },
    generalAnnouncements: { type: Boolean, default: true }
  }
}, {
  timestamps: true
});

// ✅ Correct export
const User = mongoose.model('User', userSchema);
module.exports = User;


