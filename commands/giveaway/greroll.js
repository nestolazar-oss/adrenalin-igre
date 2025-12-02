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

async function saveGiveaways(giveaways) {
  try {
    await fs.writeFile(GIVEAWAY_FILE, JSON.stringify(giveaways, null, 2));
  } catch (e) {
    console.error('Save error:', e);
  }
}

export const meta = {
  name: 'greroll',
  description: 'Reroll pobednika'
};

export async function execute(message, args) {
  if (!message.member.permissions.has('ManageGuild')) {
    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`${emoji('reject')} Pristup odbijen`)
      .setDescription('Nemaš dozvolu!')
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  const giveawayId = args[0];

  if (!giveawayId) {
    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`${emoji('error')} Greška`)
      .setDescription(`Koristi: \`-greroll <giveaway_id>\``)
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  const giveaways = await getGiveaways();

  if (!giveaways[giveawayId]) {
    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`${emoji('error')} Greška`)
      .setDescription('Giveaway nije pronađen!')
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  const giveaway = giveaways[giveawayId];

  const eligibleParticipants = giveaway.participants.filter(
    p => !giveaway.winners.includes(p)
  );

  if (eligibleParticipants.length === 0) {
    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`${emoji('error')} Greška`)
      .setDescription('Nema ostalih učesnika!')
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  const newWinners = [];
  for (let i = 0; i < giveaway.winnersCount && i < eligibleParticipants.length; i++) {
    const randomIndex = Math.floor(Math.random() * eligibleParticipants.length);
    const winner = eligibleParticipants[randomIndex];
    newWinners.push(winner);
    eligibleParticipants.splice(randomIndex, 1);
  }

  giveaway.winners = newWinners;
  await saveGiveaways(giveaways);

  // Pošalji DM pobedniku
  const client = message.client;
  for (const winnerId of newWinners) {
    try {
      const winner = await client.users.fetch(winnerId);
      const dmEmbed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle(`${emoji('trophy')} ČESTITAM! Pobedio si Giveaway!`)
        .setDescription(`Nagrada: **${giveaway.prize}**`)
        .addFields(
          { name: 'Info', value: 'Odgovori sa "YES" u roku od 10 sekundi da potvrdis!', inline: false }
        )
        .setTimestamp();

      await winner.send({ embeds: [dmEmbed] });
    } catch (e) {
      console.error('DM error:', e);
    }
  }

  const embed = new EmbedBuilder()
    .setColor(0x2ECC71)
    .setTitle(`${emoji('success')} Reroll Izvršen`)
    .setDescription(`Novi pobednici su odabrani!`)
    .addFields(
      { name: `${emoji('trophy')} Pobednika`, value: newWinners.map(id => `<@${id}>`).join(', '), inline: false }
    )
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}