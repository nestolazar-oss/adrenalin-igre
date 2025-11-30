export const meta_greroll = {
  name: 'greroll',
  description: 'Reroll pobednika'
};

export async function execute_greroll(message, args) {
  if (!message.member.permissions.has('ManageGuild')) {
    return message.reply(`${emoji('reject')} Nemaš dozvolu!`);
  }

  const giveawayId = args[0];

  if (!giveawayId) {
    return message.reply(`${emoji('error')} Koristi: \`-greroll <giveaway_id>\``);
  }

  const giveaways = await getGiveaways();

  if (!giveaways[giveawayId]) {
    return message.reply(`${emoji('error')} Giveaway nije pronađen!`);
  }

  const giveaway = giveaways[giveawayId];

  // Izaberi nove pobedinike (isključi prethodne)
  const eligibleParticipants = giveaway.participants.filter(
    p => !giveaway.winners.includes(p)
  );

  if (eligibleParticipants.length === 0) {
    return message.reply(`${emoji('error')} Nema ostalih učesnika!`);
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

  // Pošalji DM pobediniku
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
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}
