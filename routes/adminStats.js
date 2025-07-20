const express = require('express');
const router = express.Router();
const User = require('../models/User');
const requireLogin = require('../middleware/requireLogin');
// mongoose
const mongoose = require('mongoose');
const Tournament = require('../models/Tournament');
const MatchRegistration = require('../models/MatchRegistration');
const Transaction = require('../models/Transaction');
const withdraw = require('../models/withdraw');

const tournamentController = require('../controllers/tournamentController');



router.get('/stats', async (req, res) => {
  const { from, to } = req.query;

  const start = from ? new Date(from) : new Date('2000-01-01');
  const end = to ? new Date(to) : new Date();

  try {
    const users = await User.countDocuments({ createdAt: { $gte: start, $lte: end } });
    const tournaments = await Tournament.countDocuments({ createdAt: { $gte: start, $lte: end } });
    const matches = await MatchRegistration.countDocuments({ createdAt: { $gte: start, $lte: end } });
   
    
    const transactions = await Transaction.aggregate([
      {
        $match: {
          type: 'Entry Fee',
          status: 'Success',
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" }
        }
      }
    ]);
    const earned = transactions[0]?.total || 0;
    console.log("Stats:", users, tournaments, matches, earned);

    res.json({ users, tournaments, matches, earned });
  } catch (err) {
    console.error("Error getting stats:", err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});


const { getMatchRegistrations, updateMatchRegistration, bulkUpdateMatchRegistrations } = require('../controllers/matchRegistrationController');


router.get('/match-registrations', getMatchRegistrations);
router.put('/match-registrations/:tournamentId/:username/update', updateMatchRegistration);

router.put('/match-registrations/bulk-update', bulkUpdateMatchRegistrations);


const { getAllWithdrawRequests, updateWithdrawRequest } = require('../controllers/WithdrawUpdates');

router.get('/withdraw', getAllWithdrawRequests);
router.put('/withdraw/:id', updateWithdrawRequest);


router.get('/tournaments', tournamentController.getTournaments);
router.post('/tournaments/create', tournamentController.createTournament);
router.patch('/tournaments/:id', tournamentController.updateTournament);
router.delete('/tournaments/:id', tournamentController.deleteTournament);
router.put('/match-registrations/tournament-complete-update', tournamentController.tournamentCompleteUpdate);



module.exports = router;

