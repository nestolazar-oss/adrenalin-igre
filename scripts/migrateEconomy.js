const fs = require('fs');
const path = require('path');
const { connect } = require('../utils/mongoose');
const User = require('../models/User');

async function migrate() {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) { console.error('Set MONGO_URI in env first'); process.exit(1); }
  await connect(MONGO_URI);
  const file = path.join(__dirname, '..', 'economy.json');
  if (!fs.existsSync(file)) { console.error('economy.json not found'); process.exit(1); }
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')); 
  const entries = Object.entries(raw);
  for (const [userId, data] of entries) {
    const doc = { userId, cash: Number.isFinite(Number(data.cash)) ? Number(data.cash) : 0, bank: Number.isFinite(Number(data.bank)) ? Number(data.bank) : 0, createdAt: new Date() };
    await User.findOneAndUpdate({ userId }, { $set: doc }, { upsert: true, setDefaultsOnInsert: true });
    console.log('Migrated', userId);
  }
  console.log('Migration complete'); process.exit(0);
}

migrate().catch(err => { console.error(err); process.exit(1); });