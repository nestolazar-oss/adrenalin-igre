const User = require('../models/User');
const mongoose = require('mongoose');

function sanitizeNumber(value, fallback = null) {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function getUser(userId) {
  if (!userId) throw new Error('userId required');
  let user = await User.findOne({ userId }).exec();
  if (!user) user = await User.create({ userId });
  return user;
}

async function safeInc(userId, field, delta, options = {}) {
  const d = sanitizeNumber(delta, null);
  if (d === null) throw new Error('Invalid delta: not a number');
  const allowed = options.allowedFields || ['cash', 'bank'];
  if (!allowed.includes(field)) throw new Error('Field not allowed for increment');
  const res = await User.findOneAndUpdate(
    { userId },
    { $inc: { [field]: d } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).exec();
  if (res[field] < 0) {
    res[field] = 0;
    await res.save();
  }
  return res;
}

async function safeSet(userId, field, value, options = {}) {
  const v = sanitizeNumber(value, null);
  if (v === null) throw new Error('Invalid value: not a number');
  const allowed = options.allowedFields || ['cash', 'bank'];
  if (!allowed.includes(field)) throw new Error('Field not allowed for set');
  const res = await User.findOneAndUpdate(
    { userId },
    { $set: { [field]: v } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).exec();
  return res;
}

async function transfer(fromId, toId, amount) {
  const amt = sanitizeNumber(amount, null);
  if (amt === null || amt <= 0) throw new Error('Invalid transfer amount');
  const from = await getUser(fromId);
  if (from.cash < amt) throw new Error('Insufficient funds');
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await User.findOneAndUpdate({ userId: fromId }, { $inc: { cash: -amt } }, { session });
    await User.findOneAndUpdate({ userId: toId }, { $inc: { cash: amt } }, { session, upsert: true, setDefaultsOnInsert: true });
    await session.commitTransaction();
    session.endSession();
    return true;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

module.exports = { sanitizeNumber, getUser, safeInc, safeSet, transfer };