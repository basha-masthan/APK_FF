// models/SquadGroupSelection.js
const mongoose = require('mongoose');

const SquadGroupSelectionSchema = new mongoose.Schema({
  uname: { type: String, required: true },
  freeFireId: { type: String, required: true },
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  group: { type: String, enum: ['A', 'B'], required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SquadGroupSelection', SquadGroupSelectionSchema);
