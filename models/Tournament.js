const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  tournamentId: {
    type: String,
    unique: true,
    required: true
  },
  mvp: {
    username: { type: String },
    moneyEarned: { type: Number },
    kills: { type: Number },
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

  room: {
    id: { type: String },
    password: { type: String },
  },

  // ✅ NEW: Badge and assignment tracking fields
  assignmentBadge: {
    type: String,
    enum: ['none', 'assigned', 'multiple'],
    default: 'none'
  },

  assignmentCount: {
    type: Number,
    default: 0
  },

  lastAssignedAt: {
    type: Date
  },

  assignmentHistory: [{
    assignedAt: {
      type: Date,
      default: Date.now
    },
    playersUpdated: {
      type: Number,
      default: 0
    },
    assignedBy: {
      type: String, // Admin username if available
      default: 'System'
    }
  }]

}, { timestamps: true });

// ✅ NEW: Methods for badge management
tournamentSchema.methods.updateAssignmentBadge = function() {
  this.assignmentCount += 1;
  this.lastAssignedAt = new Date();
  
  if (this.assignmentCount === 1) {
    this.assignmentBadge = 'assigned';
  } else if (this.assignmentCount > 1) {
    this.assignmentBadge = 'multiple';
  }
  
  return this;
};

tournamentSchema.methods.addAssignmentHistory = function(playersUpdated, assignedBy = 'System') {
  this.assignmentHistory.push({
    assignedAt: new Date(),
    playersUpdated,
    assignedBy
  });
  
  return this;
};

// Safe model declaration to avoid OverwriteModelError in dev
const Tournament = mongoose.models.Tournament || mongoose.model('Tournament', tournamentSchema);
module.exports = Tournament;
