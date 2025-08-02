const mongoose = require('mongoose');

const matchRegistrationSchema = new mongoose.Schema({
  username: { type: String, required: true },
  freefireId: { type: String, required: true, unique: true },
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  status: { type: String, enum: ['Registered', 'Cancelled'], default: 'Registered' },
  kills: { type: Number, default: 0 },
  moneyEarned: { type: Number, default: 0 },
  booking: { type: Boolean, default: false },
  joinedAt: { type: Date, default: Date.now },
  screenshotUrl: { type: String, default: '' },

  // 🆕 OCR-related fields
  position: { type: String, default: null },          // e.g., "21/29"
  screenshotVerified: { type: Boolean, default: false }

}, {
  timestamps: true
});

const MatchRegistration = mongoose.model('MatchRegistration', matchRegistrationSchema);
module.exports = MatchRegistration;
