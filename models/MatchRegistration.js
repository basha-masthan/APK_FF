const mongoose = require('mongoose');

const matchRegistrationSchema = new mongoose.Schema({
  username: { type: String, required: true },
  freefireId: { type: String, required: true, unique: true },
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  status: { type: String, enum: ['Registered', 'Cancelled'], default: 'Registered' },
  kills: { type: Number, default: 0 }, // ✅ New field
  moneyEarned: { type: Number, default: 0 }, // ✅ New field
  booking: { type: Boolean, default: false }, // ✅ New field
  joinedAt: { type: Date, default: Date.now },

}, {
  timestamps: true
});

const MatchRegistration = mongoose.model('MatchRegistration', matchRegistrationSchema);
module.exports = MatchRegistration;
