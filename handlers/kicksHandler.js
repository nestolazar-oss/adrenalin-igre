import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KICKS_FILE = path.join(__dirname, '../data/kicks.json');

async function ensureKicksFile() {
  try {
    await fs.mkdir(path.dirname(KICKS_FILE), { recursive: true });
    try {
      await fs.access(KICKS_FILE);
    } catch {
      await fs.writeFile(KICKS_FILE, JSON.stringify({}, null, 2));
    }
  } catch (e) {
    console.error('Kicks file error:', e);
  }
}

export async function getKicks(guildId, userId) {
  await ensureKicksFile();
  try {
    const data = await fs.readFile(KICKS_FILE, 'utf8');
    const json = JSON.parse(data);
    return json[`${guildId}-${userId}`] || [];
  } catch {
    return [];
  }
}

export async function getAllKicks(guildId) {
  await ensureKicksFile();
  try {
    const data = await fs.readFile(KICKS_FILE, 'utf8');
    const json = JSON.parse(data);
    const kicks = [];
    
    for (const [key, value] of Object.entries(json)) {
      if (key.startsWith(`${guildId}-`)) {
        kicks.push(...value);
      }
    }
    
    return kicks;
  } catch {
    return [];
  }
}

export async function addKick(guildId, userId, reason, moderatorTag, moderatorId) {
  await ensureKicksFile();
  try {
    const data = await fs.readFile(KICKS_FILE, 'utf8');
    const json = JSON.parse(data);
    const key = `${guildId}-${userId}`;

    if (!json[key]) json[key] = [];

    const kick = {
      userId,
      reason,
      moderator: moderatorTag,
      moderatorId,
      timestamp: new Date().toISOString()
    };

    json[key].push(kick);
    await fs.writeFile(KICKS_FILE, JSON.stringify(json, null, 2));

    return kick;
  } catch (e) {
    console.error('Add kick error:', e);
    return null;
  }
}

export default { getKicks, getAllKicks, addKick };