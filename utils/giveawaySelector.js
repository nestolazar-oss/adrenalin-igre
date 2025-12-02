// utils/giveawaySelector.js
import { getGiveaways, saveGiveaways } from './giveaways.js';
import { EmbedBuilder } from 'discord.js';

export async function selectWinners(giveawayId, client) {
  try {
    const giveaways = await getGiveaways();
    const giveaway = giveaways[giveawayId];

    if (!giveaway) {
      console.error(`❌ Giveaway ${giveawayId} not found.`);
      return;
    }

    if (!Array.isArray(giveaway.participants) || giveaway.participants.length === 0) {
      giveaway.status = 'NO_WINNERS';
      await saveGiveaways(giveaways);
      return;
    }

    const pool = [...new Set(giveaway.participants)];
    const winners = [];
    const winnerCount = giveaway.winnersCount || 1;
    const count = Math.min(winnerCount, pool.length);

    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      winners.push(pool[idx]);
      pool.splice(idx, 1);
    }

    giveaway.winners = winners;
    giveaway.status = 'FINISHED';

    await saveGiveaways(giveaways);

    // SEND RESULT TO CHANNEL
    const channel = client.channels.cache.get(giveaway.channelId);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle(`${emoji('tada')} Giveaway Winners`)
      .setDescription(
        winners.map((w, i) => `**${i + 1}.** <@${w}>`).join('\n')
      )
      .setFooter({ text: `Giveaway ID: ${giveawayId}` })
      .setTimestamp();

    await channel.send({ embeds: [embed] });

  } catch (err) {
    console.error(`❌ Giveaway winner selection error:`, err);
  }
}
