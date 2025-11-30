export const meta_glist = {
  name: 'glist',
  description: 'Lista aktivnih giveawayeva'
};

export async function execute_glist(message, args) {
  const giveaways = await getGiveaways();
  const guildGiveaways = Object.entries(giveaways)
    .filter(([_, g]) => g.guildId === message.guild.id && g.status === 'ACTIVE');

  if (guildGiveaways.length === 0) {
    return message.reply(`${emoji('error')} Nema aktivnih giveawayeva!`);
  }

  const lines = guildGiveaways.map(([id, g]) => {
    const timeLeft = g.endsAt - Date.now();
    const days = Math.floor(timeLeft / 86400000);
    const hours = Math.floor((timeLeft % 86400000) / 3600000);
    const minutes = Math.floor((timeLeft % 3600000) / 60000);

    return `${emoji('tada')} **${g.prize}** - ${g.participants.length} učesnika - ${days}d ${hours}h ${minutes}m\nID: \`${id}\``;
  }).join('\n\n');

  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle(`${emoji('stats')} Aktivni Giveawayevi`)
    .setDescription(lines)
    .setFooter({ text: `Ukupno: ${guildGiveaways.length}` })
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}