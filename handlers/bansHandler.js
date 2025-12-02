import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BANS_FILE = path.join(__dirname, '../data/bans.json');

async function ensureBansFile() {
  try {
    await fs.mkdir(path.dirname(BANS_FILE), { recursive: true });
    try {
      await fs.access(BANS_FILE);
    } catch {
      await fs.writeFile(BANS_FILE, JSON.stringify({}, null, 2));
    }
  } catch (e) {
    console.error('Bans file error:', e);
  }
}

export async function getBans(guildId, userId) {
  await ensureBansFile();
  try {
    const data = await fs.readFile(BANS_FILE, 'utf8');
    const json = JSON.parse(data);
    return json[`${guildId}-${userId}`] || [];
  } catch {
    return [];
  }
}

export async function getAllBans(guildId) {
  await ensureBansFile();
  try {
    const data = await fs.readFile(BANS_FILE, 'utf8');
    const json = JSON.parse(data);
    const bans = [];
    
    for (const [key, value] of Object.entries(json)) {
      if (key.startsWith(`${guildId}-`)) {
        bans.push(...value);
      }
    }
    
    return bans;
  } catch {
    return [];
  }
}

export async function addBan(guildId, userId, reason, moderatorTag, moderatorId) {
  await ensureBansFile();
  try {
    const data = await fs.readFile(BANS_FILE, 'utf8');
    const json = JSON.parse(data);
    const key = `${guildId}-${userId}`;

    if (!json[key]) json[key] = [];

    const ban = {
      userId,
      reason,
      moderator: moderatorTag,
      moderatorId,
      timestamp: new Date().toISOString(),
      active: true
    };

    json[key].push(ban);
    await fs.writeFile(BANS_FILE, JSON.stringify(json, null, 2));

    return ban;
  } catch (e) {
    console.error('Add ban error:', e);
    return null;
  }
}

export async function removeBan(guildId, userId) {
  await ensureBansFile();
  try {
    const data = await fs.readFile(BANS_FILE, 'utf8');
    const json = JSON.parse(data);
    const key = `${guildId}-${userId}`;

    if (!json[key]) return false;

    // Označi zadnji ban kao neaktivan
    const lastBan = json[key][json[key].length - 1];
    if (lastBan) {
      lastBan.active = false;
    }

    await fs.writeFile(BANS_FILE, JSON.stringify(json, null, 2));
    return true;
  } catch (e) {
    console.error('Remove ban error:', e);
    return false;
  }
}

export default { getBans, getAllBans, addBan, removeBan };