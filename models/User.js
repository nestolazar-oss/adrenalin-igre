const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  cash: { type: Number, default: 0, min: 0 },
  bank: { type: Number, default: 0, min: 0 },
  cooldowns: {
    work: { type: Date, default: null },
    daily: { type: Date, default: null }
  },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'users' });

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);