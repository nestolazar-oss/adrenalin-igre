import { EmbedBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import embeds from '../../utils/embeds.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPROLE_FILE = path.join(__dirname, '../../data/temproles.json');

async function ensureTemproleFile() {
  try {
    await fs.mkdir(path.dirname(TEMPROLE_FILE), { recursive: true });
    try {
      await fs.access(TEMPROLE_FILE);
    } catch {
      await fs.writeFile(TEMPROLE_FILE, JSON.stringify({}, null, 2));
    }
  } catch (e) {
    console.error('Temprole file error:', e);
  }
}

async function getTemproles() {
  await ensureTemproleFile();
  try {
    const data = await fs.readFile(TEMPROLE_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveTemproles(temproles) {
  await ensureTemproleFile();
  await fs.writeFile(TEMPROLE_FILE, JSON.stringify(temproles, null, 2));
}

export const meta = {
  name: 'temprole',
  description: 'Dodaj privremenu ulogu korisniku'
};

export async function execute(message, args) {
  if (!message.member.permissions.has('ManageRoles')) {
    return message.reply(embeds.error('Greška', `${emoji('reject')} Nemaš dozvolu!`));
  }

  const target = message.mentions.users.first();
  const roleName = args[1];
  const durationStr = args[2] || '1h';

  if (!target || !roleName) {
    return message.reply(embeds.error('Greška', `${emoji('error')} Koristi: \`-temprole @user <role_name> <1h|1d>\``));
  }

  const member = await message.guild.members.fetch(target.id).catch(() => null);
  if (!member) {
    return message.reply(embeds.error('Greška', `${emoji('error')} Korisnik nije na serveru!`));
  }

  const role = message.guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
  if (!role) {
    return message.reply(embeds.error('Greška', `${emoji('error')} Uloga nije pronađena!`));
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
    await member.roles.add(role);

    const temproles = await getTemproles();
    const guildId = message.guildId;

    if (!temproles[guildId]) temproles[guildId] = [];

    temproles[guildId].push({
      userId: target.id,
      roleId: role.id,
      removeAt: Date.now() + duration,
      giver: message.author.tag
    });

    await saveTemproles(temproles);

    const embed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle(`${emoji('timer')} Privremena Uloga`)
      .addFields(
        { name: `${emoji('info')} Korisnik`, value: `${target.tag}`, inline: true },
        { name: `${emoji('info')} Uloga`, value: role.name, inline: true },
        { name: `${emoji('clock')} Trajanje`, value: durationStr, inline: true }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Temprole error:', error);
    return message.reply(embeds.error('Greška', `${emoji('error')} Nisam mogao dodati ulogu!`));
  }
}