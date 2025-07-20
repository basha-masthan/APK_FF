const Withdraw = require('../models/withdraw');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

// @desc Get all withdraw requests
exports.getAllWithdrawRequests = async (req, res) => {
  try {
    const requests = await Withdraw.find().sort({ createdAt: -1 });
    res.json({ success: true, data: requests });
  } catch (err) {
    console.error("Fetch withdraw requests error:", err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};


// @desc Update withdraw request status (Completed / Cancelled)

exports.updateWithdrawRequest = async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;

  try {
    if (!['Completed', 'Cancelled'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const request = await Withdraw.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Withdraw request not found' });
    }

    const txn = await Transaction.findOneAndUpdate(
      {
        username: request.username,
        type: 'Withdraw',
        amount: { $eq: parseFloat(request.amount) },
        status: 'Pending'
      },
      { status },
      { new: true }
    );

    if (!txn) {
      console.warn(`❗ No matching transaction for user=${request.username}, amount=₹${request.amount}`);
      return res.status(404).json({ success: false, error: 'Matching transaction not found' });
    }

    if (status === 'Cancelled') {
      const user = await User.findOne({ uname: request.username });
      if (user) {
        user.winningMoney = (user.winningMoney || 0) + parseFloat(request.amount);
        await user.save();
        console.log(`💸 Refunded ₹${request.amount} to ${user.uname}`);
      } else {
        console.warn(`❗ User not found: ${request.username}`);
        return res.status(404).json({ success: false, error: 'User not found for refund' });
      }
    }

    await Withdraw.findByIdAndDelete(id);
    res.json({ success: true });

  } catch (err) {
    console.error("❌ Withdraw update error:", err);
    res.status(500).json({ success: false, error: "Failed to update withdraw request" });
  }
};
