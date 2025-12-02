import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WARNS_FILE = path.join(__dirname, '../data/warns.json');

async function ensureWarnsFile() {
  try {
    await fs.mkdir(path.dirname(WARNS_FILE), { recursive: true });
    try {
      await fs.access(WARNS_FILE);
    } catch {
      await fs.writeFile(WARNS_FILE, JSON.stringify({}, null, 2));
    }
  } catch (e) {
    console.error('Warns file error:', e);
  }
}

export async function getWarns(guildId, userId) {
  await ensureWarnsFile();
  try {
    const data = await fs.readFile(WARNS_FILE, 'utf8');
    const json = JSON.parse(data);
    return json[`${guildId}-${userId}`] || [];
  } catch {
    return [];
  }
}

export async function addWarn(guildId, userId, reason, moderatorTag) {
  await ensureWarnsFile();
  try {
    const data = await fs.readFile(WARNS_FILE, 'utf8');
    const json = JSON.parse(data);
    const key = `${guildId}-${userId}`;

    if (!json[key]) json[key] = [];

    const warn = {
      id: json[key].length + 1,
      reason,
      moderator: moderatorTag,
      timestamp: new Date().toISOString()
    };

    json[key].push(warn);
    await fs.writeFile(WARNS_FILE, JSON.stringify(json, null, 2));

    return warn;
  } catch (e) {
    console.error('Add warn error:', e);
    return null;
  }
}

export async function removeWarn(guildId, userId, warnId) {
  await ensureWarnsFile();
  try {
    const data = await fs.readFile(WARNS_FILE, 'utf8');
    const json = JSON.parse(data);
    const key = `${guildId}-${userId}`;

    if (!json[key]) return false;

    const index = json[key].findIndex(w => w.id === warnId);
    if (index === -1) return false;

    json[key].splice(index, 1);
    await fs.writeFile(WARNS_FILE, JSON.stringify(json, null, 2));

    return true;
  } catch (e) {
    console.error('Remove warn error:', e);
    return false;
  }
}

export async function clearWarns(guildId, userId) {
  await ensureWarnsFile();
  try {
    const data = await fs.readFile(WARNS_FILE, 'utf8');
    const json = JSON.parse(data);
    const key = `${guildId}-${userId}`;

    if (json[key]) {
      json[key] = [];
      await fs.writeFile(WARNS_FILE, JSON.stringify(json, null, 2));
      return true;
    }
    return false;
  } catch (e) {
    console.error('Clear warns error:', e);
    return false;
  }
}

export default { getWarns, addWarn, removeWarn, clearWarns };