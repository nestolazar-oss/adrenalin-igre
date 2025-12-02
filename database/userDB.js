import mongoose from "mongoose";

// ===========================
// USER SCHEMA
// ===========================
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },

  // economy
  cash: { type: Number, default: 1000 },
  bank: { type: Number, default: 0 },

  // cooldowns
  lastWork: { type: Number, default: 0 },
  lastCrime: { type: Number, default: 0 },
  lastSlut: { type: Number, default: 0 },
  lastRob: { type: Number, default: 0 },

  // stats - lifetime
  messages: { type: Number, default: 0 },
  voiceTime: { type: Number, default: 0 },

  // stats - daily tracking
  dailyMessages: { type: Object, default: {} },
  dailyVoice: { type: Object, default: {} },

  // stats - per-channel message tracking
  channelMessages: { type: Object, default: {} },

}, { minimize: false });

const User = mongoose.model("User", userSchema);

// ===========================
// INIT USER
// ===========================
export async function initUser(userId) {
  let user = await User.findOne({ userId });

  if (!user) {
    user = await User.create({ userId });
  }

  return user;
}

// ===========================
// GET USER
// ===========================
export async function getUser(userId) {
  let user = await User.findOne({ userId });

  if (!user) {
    user = await User.create({ userId });
  }

  return user;
}

// ===========================
// UPDATE USER
// ===========================
export async function updateUser(userId, data) {
  const user = await User.findOneAndUpdate(
    { userId },
    { $set: data },
    { new: true, upsert: true }
  );

  return user;
}

// ===========================
// GET ALL USERS
// ===========================
export async function getAllUsers() {
  return await User.find({});
}

// ===========================
// BACKUP DATABASE
// ===========================
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function backupDB() {
  try {
    const users = await User.find({}).lean();

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.join(__dirname, "../backups");

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const filePath = path.join(backupDir, `mongo_backup_${timestamp}.json`);
    fs.writeFileSync(filePath, JSON.stringify({ users }, null, 2));

    console.log(`📦 MongoDB backup created: ${filePath}`);
  } catch (err) {
    console.error("❌ MongoDB backup error:", err.message);
  }
}

export default {
  initUser,
  getUser,
  updateUser,
  getAllUsers,
  backupDB
};
