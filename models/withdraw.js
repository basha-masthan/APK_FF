const mongoose = require('mongoose');

const withdrawRequestSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  upiId: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: {
    type: Date
  }
}, { timestamps: true });

const WithdrawRequest = mongoose.model('WithdrawRequest', withdrawRequestSchema);
module.exports = WithdrawRequest;
