import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, '../economy.json');

// ===== LOAD DATABASE =====
export function loadDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify({ users: {} }, null, 2));
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('❌ Error loading database:', err.message);
    return { users: {} };
  }
}

// ===== SAVE DATABASE =====
export function saveDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('❌ Error saving database:', err.message);
  }
}

// ===== INIT USER =====
export function initUser(userId) {
  const db = loadDB();
  if (!db.users[userId]) {
    db.users[userId] = {
      cash: 1000,
      bank: 0,
      lastWork: 0,
      lastCrime: 0,
      lastSlut: 0,
      lastRob: 0
    };
    saveDB(db);
  }
  return db.users[userId];
}

// ===== GET USER =====
export function getUser(userId) {
  const db = loadDB();
  return db.users[userId] || initUser(userId);
}

// ===== UPDATE USER =====
export function updateUser(userId, data) {
  const db = loadDB();
  if (!db.users[userId]) {
    initUser(userId);
  }
  db.users[userId] = { ...db.users[userId], ...data };
  saveDB(db);
  return db.users[userId];
}

// ===== GET ALL USERS =====
export function getAllUsers() {
  return loadDB().users;
}

// ===== BACKUP =====
export function backupDB() {
  try {
    const db = loadDB();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const filePath = path.join(backupDir, `economy_${timestamp}.json`);
    fs.writeFileSync(filePath, JSON.stringify(db, null, 2));
    console.log(`📦 Backup created: ${filePath}`);
  } catch (err) {
    console.error('❌ Error creating backup:', err.message);
  }
}