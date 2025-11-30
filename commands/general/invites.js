import { EmbedBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INVITES_FILE = path.join(__dirname, '../../data/invites.json');

async function ensureInvitesFile() {
  try {
    await fs.mkdir(path.dirname(INVITES_FILE), { recursive: true });
    try {
      await fs.access(INVITES_FILE);
    } catch {
      await fs.writeFile(INVITES_FILE, JSON.stringify({}, null, 2));
    }
  } catch (e) {
    console.error('Invites file error:', e);
  }
}

async function getInvites() {
  await ensureInvitesFile();
  try {
    const data = await fs.readFile(INVITES_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveInvites(invites) {
  await ensureInvitesFile();
  await fs.writeFile(INVITES_FILE, JSON.stringify(invites, null, 2));
}

export const meta_invites = {
  name: 'invites',
  description: 'Upravljaj pozivima'
};

export async function execute_invites(message, args) {
  const action = args[0]?.toLowerCase();
  const target = message.mentions.users.first();

  const invites = await getInvites();
  const guildId = message.guildId;

  if (!invites[guildId]) invites[guildId] = {};

  // Default - prikaži svoje pozive
  if (!action) {
    const userInvites = invites[guildId][message.author.id] || 0;

    const embed = new EmbedBuilder()
      .setColor(0x2596BE)
      .setTitle(`${emoji('stats')} Tvoji Pozivi`)
      .addFields(
        { name: `${emoji('tacka')} Poziva`, value: userInvites.toString(), inline: true }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  // User - prikaži pozive određenog korisnika
  if (action === 'user') {
    if (!target) {
      return message.reply(`${emoji('error')} Označi korisnika!`);
    }

    const userInvites = invites[guildId][target.id] || 0;

    const embed = new EmbedBuilder()
      .setColor(0x2596BE)
      .setTitle(`${emoji('stats')} Pozivi - ${target.username}`)
      .addFields(
        { name: `${emoji('tacka')} Poziva`, value: userInvites.toString(), inline: true }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  // Add - dodaj pozive
  if (action === 'add') {
    if (!message.member.permissions.has('ManageGuild')) {
      return message.reply(`${emoji('reject')} Nemaš dozvolu!`);
    }

    if (!target) {
      return message.reply(`${emoji('error')} Označi korisnika!`);
    }

    const amount = parseInt(args[2]) || 1;

    if (!invites[guildId][target.id]) invites[guildId][target.id] = 0;
    invites[guildId][target.id] += amount;

    await saveInvites(invites);

    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle(`${emoji('success')} Pozivi Dodani`)
      .addFields(
        { name: 'Korisnik', value: target.tag, inline: true },
        { name: 'Dodano', value: `+${amount}`, inline: true },
        { name: 'Ukupno', value: invites[guildId][target.id].toString(), inline: true }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  // Remove - oduzmi pozive
  if (action === 'remove') {
    if (!message.member.permissions.has('ManageGuild')) {
      return message.reply(`${emoji('reject')} Nemaš dozvolu!`);
    }

    if (!target) {
      return message.reply(`${emoji('error')} Označi korisnika!`);
    }

    const amount = parseInt(args[2]) || 1;

    if (!invites[guildId][target.id]) invites[guildId][target.id] = 0;
    invites[guildId][target.id] = Math.max(0, invites[guildId][target.id] - amount);

    await saveInvites(invites);

    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`${emoji('reject')} Pozivi Oduzeti`)
      .addFields(
        { name: 'Korisnik', value: target.tag, inline: true },
        { name: 'Oduzeto', value: `-${amount}`, inline: true },
        { name: 'Ukupno', value: invites[guildId][target.id].toString(), inline: true }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  return message.reply(`${emoji('error')} Koristi: \`-invites [user|add|remove] [@user] [amount]\``);
}