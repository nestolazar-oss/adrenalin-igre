import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getAllUsers } from '../../utils/db.js';

const ITEMS_PER_PAGE = 10;

export const meta = {
  name: 'leaderboard',
  aliases: ['lb, top'],
  description: 'Prikaži leaderboard'
};

export async function execute(message, args) {
  const allUsers = getAllUsers();
  const guild = message.guild;

  const sorted = Object.entries(allUsers)
    .map(([id, data]) => ({
      id,
      cash: data.cash || 0,
      bank: data.bank || 0
    }))
    .sort((a, b) => (b.cash + b.bank) - (a.cash + a.bank));

  if (sorted.length === 0) {
    return message.reply('❌ Nema korisnika u leaderboardu!');
  }

  const totalPages = Math.ceil(Math.max(1, sorted.length / ITEMS_PER_PAGE));
  const page = Math.max(0, Math.min(parseInt(args[0] || 1) - 1, totalPages - 1));

  const start = page * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const pageUsers = sorted.slice(start, end);

  // Funkcija da prikaže user-a pravilno
  const formatUser = async (userId) => {
    try {
      const member = await guild.members.fetch(userId);
      return `${member} (ID: ${userId})`; // tag + ID
    } catch {
      return `\`${userId}\``; // user nije na serveru
    }
  };

  let description = `🏆 **Leaderboard - Stranica ${page + 1}/${totalPages}**\n\n`;

  for (let i = 0; i < pageUsers.length; i++) {
    const u = pageUsers[i];
    const rank = start + i + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '  ';
    const total = u.cash + u.bank;

    const userText = await formatUser(u.id);

    description += `${medal} #${rank}. ${userText} • **$${total.toLocaleString()}** (💵 $${u.cash.toLocaleString()} | 🏦 $${u.bank.toLocaleString()})\n`;
  }

  const userRank = sorted.findIndex(u => u.id === message.author.id) + 1;
  description += `\n🔍 **Tvoj rang:** ${userRank > 0 ? `#${userRank}` : 'N/A'}`;

  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle(`🏆 ${guild.name} — Leaderboard`)
    .setDescription(description)
    .setFooter({ text: `Stranica ${page + 1}/${totalPages}` })
    .setTimestamp();

  const buttons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`lb_prev_${page}`)
        .setEmoji('◀️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId(`lb_next_${page}`)
        .setEmoji('▶️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= totalPages - 1)
    );

  const reply = await message.reply({ embeds: [embed], components: [buttons] });

  // -----------------------------
  // PAGINATOR
  // -----------------------------
  const collector = reply.createMessageComponentCollector({ time: 60000 });

  collector.on('collect', async (interaction) => {
    if (interaction.user.id !== message.author.id) {
      return interaction.reply({ content: '❌ Ovo nije tvoja komanda!', ephemeral: true });
    }

    const [action, direction, currentPage] = interaction.customId.split('_');
    let newPage = parseInt(currentPage);

    if (direction === 'prev') newPage = Math.max(0, newPage - 1);
    if (direction === 'next') newPage = Math.min(totalPages - 1, newPage + 1);

    const newStart = newPage * ITEMS_PER_PAGE;
    const newEnd = newStart + ITEMS_PER_PAGE;
    const newPageUsers = sorted.slice(newStart, newEnd);

    let newDescription = `🏆 **Leaderboard - Stranica ${newPage + 1}/${totalPages}**\n\n`;

    for (let i = 0; i < newPageUsers.length; i++) {
      const u = newPageUsers[i];
      const rank = newStart + i + 1;
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '  ';
      const total = u.cash + u.bank;

      const userText = await formatUser(u.id);

      newDescription += `${medal} #${rank}. ${userText} • **$${total.toLocaleString()}** (💵 $${u.cash.toLocaleString()} | 🏦 $${u.bank.toLocaleString()})\n`;
    }

    newDescription += `\n🔍 **Tvoj rang:** ${userRank > 0 ? `#${userRank}` : 'N/A'}`;

    const newEmbed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle(`🏆 ${guild.name} — Leaderboard`)
      .setDescription(newDescription)
      .setFooter({ text: `Stranica ${newPage + 1}/${totalPages}` })
      .setTimestamp();

    const newButtons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`lb_prev_${newPage}`)
          .setEmoji('◀️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(newPage === 0),
        new ButtonBuilder()
          .setCustomId(`lb_next_${newPage}`)
          .setEmoji('▶️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(newPage >= totalPages - 1)
      );

    await interaction.update({ embeds: [newEmbed], components: [newButtons] });
  });
}
