const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  tournamentId: {
    type: String,
    unique: true,
    required: true
  },

  game: {
    name: {
      type: String,
      required: true
    },
    logo: {
      type: String
    },
    mode: {
      type: String,
      required: true
    }
  },

  mapName: {
    type: String,
    required: true
  },

  entryFee: {
    type: Number,
    required: true
  },
  perKillReward: {
    type: Number,
    required: true
  },
  prizeMoney: {
    type: Number,
    required: true
  },

  totalSlots: {
    type: Number,
    required: true
  },
  availableSlots: {
    type: Number,
    required: true
  },

  startTime: {
    type: Date,
    required: true
  },

  status: {
    type: String,
    enum: ['Upcoming', 'Ongoing', 'Completed'],
    default: 'Upcoming'
  },
  room:{
    id: { type: String },
    password: { type: String },
  }

}, { timestamps: true });

// Safe model declaration to avoid OverwriteModelError in dev
const Tournament = mongoose.models.Tournament || mongoose.model('Tournament', tournamentSchema);
module.exports = Tournament;
