// middleware/resolveUserId.js
const User = require('../models/User');

async function resolveUserId(req, res, next) {
  if (req.session && req.session.user && req.session.user.uname) {
    // if already resolved, skip
    if (!req.session.userId) {
      try {
        const user = await User.findOne({ uname: req.session.user.uname }).select('_id uname');
        if (user) {
          req.session.userId = user._id; // cache for future
          // optional: keep uname in session.user for display
          req.session.user.uname = user.uname;
        } else {
          // uname in session invalid—clear session or handle
          delete req.session.userId;
          // you might want to log out the user here
        }
      } catch (err) {
        console.error('Error resolving session uname to id:', err);
      }
    }
  }
  next();
}

module.exports = resolveUserId;
