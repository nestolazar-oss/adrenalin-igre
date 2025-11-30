import { EmbedBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname_inv = path.dirname(fileURLToPath(import.meta.url));
const INVITER_FILE = path.join(__dirname_inv, '../../data/inviters.json');

async function ensureInviterFile() {
  try {
    await fs.mkdir(path.dirname(INVITER_FILE), { recursive: true });
    try {
      await fs.access(INVITER_FILE);
    } catch {
      await fs.writeFile(INVITER_FILE, JSON.stringify({}, null, 2));
    }
  } catch (e) {
    console.error('Inviter file error:', e);
  }
}

async function getInviters() {
  await ensureInviterFile();
  try {
    const data = await fs.readFile(INVITER_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export const meta_inviter = {
  name: 'inviter',
  description: 'Ko je pozvao korisnika'
};

export async function execute_inviter(message, args) {
  const target = message.mentions.users.first() || message.author;
  const inviters = await getInviters();
  const guildId = message.guildId;

  const inviterId = inviters[guildId]?.[target.id];

  if (!inviterId) {
    return message.reply(`${emoji('error')} Nema podataka o pozivaču za ${target.tag}`);
  }

  const inviter = await message.client.users.fetch(inviterId).catch(() => null);

  if (!inviter) {
    return message.reply(`${emoji('error')} Pozivač nije pronađen!`);
  }

  const embed = new EmbedBuilder()
    .setColor(0x2596BE)
    .setTitle(`${emoji('info')} Koji je pozvao`)
    .setDescription(`${target.tag} je pozvan od strane ${inviter.tag}`)
    .addFields(
      { name: 'Korisnik', value: target.tag, inline: true },
      { name: 'Pozivač', value: inviter.tag, inline: true }
    )
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}
