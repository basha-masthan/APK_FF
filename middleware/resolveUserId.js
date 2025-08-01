// middleware/resolveUserId.js
const User = require('../models/User');

async function resolveUserId(req, res, next) {
  try {
    if (req.session && req.session.user && req.session.user.uname) {
      if (!req.session.userId) {
        const user = await User.findOne({ uname: req.session.user.uname }).select('_id uname');
        if (user) {
          req.session.userId = user._id;
          req.session.user.uname = user.uname;
        } else {
          delete req.session.userId;
          // optionally: req.session.destroy()
        }
      }
    }
  } catch (err) {
    console.error('Error resolving session uname to id:', err);
  }
  next();
}

module.exports = resolveUserId;
