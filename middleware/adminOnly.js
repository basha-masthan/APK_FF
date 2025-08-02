function adminOnly(req, res, next) {
  if (req.session && req.session.admin === true) {
    return next(); // user is admin, continue
  } else {
    console.log("Fucking Error")
return res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = adminOnly;
