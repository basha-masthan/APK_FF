const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  gameName: {
    type: String,
    required: true,
    unique: true
  },
  gameImg: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('Game', gameSchema);
