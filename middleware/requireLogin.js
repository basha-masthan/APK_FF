module.exports = function (req, res, next) {
  if (req.session && req.session.user) {
    return next(); // user is logged in
  }

  return res.status(401).json({ error: 'Unauthorized - Please login first' });
};
