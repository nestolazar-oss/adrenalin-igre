import { EmbedBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import embeds from '../../utils/embeds.js';

const __dirname_perm = path.dirname(fileURLToPath(import.meta.url));
const PERM_FILE = path.join(__dirname_perm, '../../data/perms.json');

async function ensurePermFile() {
  try {
    await fs.mkdir(path.dirname(PERM_FILE), { recursive: true });
    try {
      await fs.access(PERM_FILE);
    } catch {
      await fs.writeFile(PERM_FILE, JSON.stringify({}, null, 2));
    }
  } catch (e) {
    console.error('Perm file error:', e);
  }
}

async function getPerms() {
  await ensurePermFile();
  try {
    const data = await fs.readFile(PERM_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function savePerms(perms) {
  await ensurePermFile();
  await fs.writeFile(PERM_FILE, JSON.stringify(perms, null, 2));
}

export const meta_perm = {
  name: 'perm',
  description: 'Dozvoli/zabrani komande po korisniku ili ulozi'
};

export async function execute_perm(message, args) {
  const OWNER_ID = process.env.OWNER_ID;
  if (message.author.id !== OWNER_ID) {
    return message.reply(embeds.error('Greška', `${emoji('reject')} Samo vlasnik bota!`));
  }

  const action = args[0]?.toLowerCase();
  const target = message.mentions.users.first() || (message.mentions.has(message.guild.roles) && message.mentions.roles.first());
  const commandName = args[2];

  if (!action || !target || !commandName) {
    return message.reply(embeds.error('Greška', `${emoji('error')} Koristi: \`-perm <allow|deny> <@user|@role> <command>\``));
  }

  const perms = await getPerms();
  const guildId = message.guildId;

  if (!perms[guildId]) perms[guildId] = {};

  const targetId = target.id;
  const targetType = target.name ? 'role' : 'user';

  if (!perms[guildId][targetId]) {
    perms[guildId][targetId] = { type: targetType, allowed: [], denied: [] };
  }

  if (action === 'allow') {
    if (!perms[guildId][targetId].allowed.includes(commandName)) {
      perms[guildId][targetId].allowed.push(commandName);
    }
    if (perms[guildId][targetId].denied.includes(commandName)) {
      perms[guildId][targetId].denied = perms[guildId][targetId].denied.filter(c => c !== commandName);
    }
  } else if (action === 'deny') {
    if (!perms[guildId][targetId].denied.includes(commandName)) {
      perms[guildId][targetId].denied.push(commandName);
    }
    if (perms[guildId][targetId].allowed.includes(commandName)) {
      perms[guildId][targetId].allowed = perms[guildId][targetId].allowed.filter(c => c !== commandName);
    }
  }

  await savePerms(perms);

  const embed = new EmbedBuilder()
    .setColor(0x3498DB)
    .setTitle(`${emoji('success')} Dozvola Postavljena`)
    .addFields(
      { name: 'Akcija', value: action.toUpperCase(), inline: true },
      { name: 'Komanda', value: commandName, inline: true },
      { name: 'Tip', value: targetType.toUpperCase(), inline: true }
    )
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}

export async function checkPermission(userId, roleIds, commandName, guildId) {
  const perms = await getPerms();
  const guildPerms = perms[guildId];

  if (!guildPerms) return true;

  // Proveri user
  if (guildPerms[userId]) {
    if (guildPerms[userId].denied.includes(commandName)) return false;
    if (guildPerms[userId].allowed.includes(commandName)) return true;
  }

  // Proveri role
  for (const roleId of roleIds) {
    if (guildPerms[roleId]) {
      if (guildPerms[roleId].denied.includes(commandName)) return false;
      if (guildPerms[roleId].allowed.includes(commandName)) return true;
    }
  }

  return true;
}