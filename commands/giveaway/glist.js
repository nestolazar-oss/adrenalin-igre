import { EmbedBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { emoji } from '../../utils/emojis.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GIVEAWAY_FILE = path.join(__dirname, '../../data/giveaways.json');

async function getGiveaways() {
  try {
    const data = await fs.readFile(GIVEAWAY_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export const meta = {
  name: 'glist',
  description: 'Lista aktivnih giveawayeva'
};

export async function execute(message, args) {
  const giveaways = await getGiveaways();
  const guildGiveaways = Object.entries(giveaways)
    .filter(([_, g]) => g.guildId === message.guild.id && g.status === 'ACTIVE');

  if (guildGiveaways.length === 0) {
    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`${emoji('error')} Greška`)
      .setDescription('Nema aktivnih giveawayeva!')
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  let description = '';

  for (const [id, g] of guildGiveaways) {
    const timeLeft = g.endsAt - Date.now();
    const days = Math.floor(timeLeft / 86400000);
    const hours = Math.floor((timeLeft % 86400000) / 3600000);
    const minutes = Math.floor((timeLeft % 3600000) / 60000);

    description += `${emoji('tada')} **${g.prize}**\n`;
    description += `${emoji('stats')} ${g.participants.length} učesnika • ${days}d ${hours}h ${minutes}m\n`;
    description += `\`${id}\`\n\n`;
  }

  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle(`${emoji('stats')} Aktivni Giveawayevi`)
    .setDescription(description)
    .setFooter({ text: `Ukupno: ${guildGiveaways.length}` })
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}