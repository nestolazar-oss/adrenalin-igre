import { EmbedBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import embeds from '../../utils/embeds.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPBAN_FILE = path.join(__dirname, '../../data/tempbans.json');

async function ensureTempbanFile() {
  try {
    await fs.mkdir(path.dirname(TEMPBAN_FILE), { recursive: true });
    try {
      await fs.access(TEMPBAN_FILE);
    } catch {
      await fs.writeFile(TEMPBAN_FILE, JSON.stringify({}, null, 2));
    }
  } catch (e) {
    console.error('Tempban file error:', e);
  }
}

async function getTempbans() {
  await ensureTempbanFile();
  try {
    const data = await fs.readFile(TEMPBAN_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveTempbans(tempbans) {
  await ensureTempbanFile();
  await fs.writeFile(TEMPBAN_FILE, JSON.stringify(tempbans, null, 2));
}

export const meta = {
  name: 'tempban',
  description: 'Privremeno banuj korisnika'
};

export async function execute(message, args) {
  if (!message.member.permissions.has('BanMembers')) {
    return message.reply(embeds.error('Greška', `${emoji('reject')} Nemaš dozvolu za tempban!`));
  }

  const target = message.mentions.users.first();
  const durationStr = args[1] || '24h';
  const reason = args.slice(2).join(' ') || 'Bez razloga';

  if (!target) {
    return message.reply(embeds.error('Greška', `${emoji('error')} Označi korisnika! \`-tempban @user <10m|1h|1d|...> [reason]\``));
  }

  const match = durationStr.match(/(\d+)([smhd])/);
  if (!match) {
    return message.reply(embeds.error('Greška', `${emoji('error')} Format: \`10m|1h|1d\``));
  }

  const amount = parseInt(match[1]);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  const duration = amount * (multipliers[unit] || 1000);

  try {
    await message.guild.bans.create(target.id, { reason });

    const tempbans = await getTempbans();
    const guildId = message.guildId;

    if (!tempbans[guildId]) tempbans[guildId] = {};

    tempbans[guildId][target.id] = {
      userId: target.id,
      unbanAt: Date.now() + duration,
      reason,
      banner: message.author.tag
    };

    await saveTempbans(tempbans);

    const embed = new EmbedBuilder()
      .setColor(0xE67E22)
      .setTitle(`${emoji('clock')} Privremeni Ban`)
      .addFields(
        { name: `${emoji('info')} Korisnik`, value: `${target.tag}`, inline: true },
        { name: `${emoji('timer')} Trajanje`, value: durationStr, inline: true },
        { name: `${emoji('stats')} Moderator`, value: `${message.author.tag}`, inline: true },
        { name: `${emoji('warning')} Razlog`, value: reason, inline: false }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Tempban error:', error);
    return message.reply(embeds.error('Greška', `${emoji('error')} Nisam mogao baniti korisnika!`));
  }
}