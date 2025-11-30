import { EmbedBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import embeds from '../../utils/embeds.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WARNS_FILE = path.join(__dirname, '../../data/warns.json');

async function getWarns() {
  try {
    const data = await fs.readFile(WARNS_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export const meta = {
  name: 'warnlist',
  aliases: ['warns'],
  description: 'Prikaži upozorenja korisnika'
};

export async function execute(message, args) {
  const target = message.mentions.users.first() || message.author;
  const warns = await getWarns();
  const guildId = message.guildId;
  const userWarns = warns[guildId]?.[target.id] || [];

  if (userWarns.length === 0) {
    return message.reply(embeds.error('Info', `${emoji('success')} ${target.tag} nema upozorenja!`));
  }

  const lines = userWarns.map((w, i) => 
    `${i + 1}. ${emoji('warning')} **${w.reason}** (${w.moderator})\n   ID: \`${w.id}\``
  ).join('\n');

  const embed = new EmbedBuilder()
    .setColor(0xF39C12)
    .setTitle(`${emoji('warn')} Upozorenja`)
    .setDescription(lines)
    .setFooter({ text: `Ukupno: ${userWarns.length} | ${target.tag}` })
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}