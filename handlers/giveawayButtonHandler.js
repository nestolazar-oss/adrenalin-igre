import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { EmbedBuilder } from 'discord.js';
import { emoji } from '../utils/emojis.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GIVEAWAY_FILE = path.join(__dirname, '../data/giveaways.json');

async function getGiveaways() {
  try {
    const data = await fs.readFile(GIVEAWAY_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveGiveaways(giveaways) {
  try {
    await fs.writeFile(GIVEAWAY_FILE, JSON.stringify(giveaways, null, 2));
  } catch (e) {
    console.error('Save giveaways error:', e);
  }
}

export async function handleGiveawayButton(interaction) {
  if (!interaction.isButton()) return;
  if (!interaction.customId.startsWith('giveaway_join_')) return;

  const giveawayId = interaction.customId.replace('giveaway_join_', '');
  const giveaways = await getGiveaways();
  const giveaway = giveaways[giveawayId];

  if (!giveaway) {
    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`${emoji('error')} Greška`)
      .setDescription('Giveaway nije pronađen!')
      .setTimestamp();
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (giveaway.status !== 'ACTIVE') {
    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`${emoji('error')} Greška`)
      .setDescription('Giveaway je već završen!')
      .setTimestamp();
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  const userId = interaction.user.id;

  if (giveaway.participants.includes(userId)) {
    const embed = new EmbedBuilder()
      .setColor(0xF39C12)
      .setTitle(`${emoji('warning')} Već si prijavljen`)
      .setDescription('Već si učestvuješ u ovom giveaway-u!')
      .setTimestamp();
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  giveaway.participants.push(userId);
  await saveGiveaways(giveaways);

  const embed = new EmbedBuilder()
    .setColor(0x2ECC71)
    .setTitle(`${emoji('success')} Prijavljen/na si`)
    .setDescription(`Uspešno si se prijavio/la za giveaway!\nNagrada: **${giveaway.prize}**`)
    .addFields(
      { name: `${emoji('stats')} Trenutnih učesnika`, value: giveaway.participants.length.toString(), inline: true }
    )
    .setTimestamp();

  return interaction.reply({ embeds: [embed], ephemeral: true });
}

export default {
  handleGiveawayButton,
  getGiveaways,
  saveGiveaways
};