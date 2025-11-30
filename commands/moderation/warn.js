import { EmbedBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import embeds from '../../utils/embeds.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WARNS_FILE = path.join(__dirname, '../../data/warns.json');

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

async function getWarns() {
  await ensureWarnsFile();
  try {
    const data = await fs.readFile(WARNS_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveWarns(warns) {
  await ensureWarnsFile();
  await fs.writeFile(WARNS_FILE, JSON.stringify(warns, null, 2));
}

export const meta = {
  name: 'warn',
  description: 'Upozori korisnika'
};

export async function execute(message, args) {
  if (!message.member.permissions.has('ModerateMembers')) {
    return message.reply(embeds.error('Greška', `${emoji('reject')} Nemaš dozvolu za warn!`));
  }

  const target = message.mentions.users.first();
  const reason = args.slice(1).join(' ') || 'Bez razloga';

  if (!target) {
    return message.reply(embeds.error('Greška', `${emoji('error')} Označi korisnika za warn!`));
  }

  if (target.bot) {
    return message.reply(embeds.error('Greška', `${emoji('reject')} Ne možeš warnati botove!`));
  }

  const warns = await getWarns();
  const guildId = message.guildId;

  if (!warns[guildId]) warns[guildId] = {};
  if (!warns[guildId][target.id]) warns[guildId][target.id] = [];

  const warnId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  warns[guildId][target.id].push({
    id: warnId,
    moderator: message.author.tag,
    reason,
    timestamp: new Date().toISOString()
  });

  await saveWarns(warns);

  const warnCount = warns[guildId][target.id].length;

  const embed = new EmbedBuilder()
    .setColor(0xF39C12)
    .setTitle(`${emoji('warn')} Warn Izvršen`)
    .addFields(
      { name: `${emoji('info')} Korisnik`, value: `${target.tag}`, inline: true },
      { name: `${emoji('stats')} Moderator`, value: `${message.author.tag}`, inline: true },
      { name: `${emoji('warning')} Razlog`, value: reason, inline: false },
      { name: `${emoji('tacka')} Ukupno upozorenja`, value: `${warnCount}`, inline: true }
    )
    .setFooter({ text: `ID: ${warnId}` })
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}