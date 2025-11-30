import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import embeds from '../../utils/embeds.js';

export const meta = {
  name: 'poll',
  aliases: ['anketa', 'vote'],
  description: 'Napravi anketu sa opcijama'
};

export async function execute(message, args) {
  if (!message.member.permissions.has('ManageMessages')) {
    return message.reply(embeds.error('Greška', `${emoji('reject')} Nemaš dozvolu za anketu!`));
  }

  const pollText = args.slice(0, args.length - 1).join(' ');
  const optionCount = parseInt(args[args.length - 1]);

  if (!pollText || isNaN(optionCount) || optionCount < 2 || optionCount > 5) {
    return message.reply(embeds.error('Greška', `${emoji('error')} Koristi: \`-poll <pitanje> <2-5>\``));
  }

  const options = ['🟢', '🔵', '🟣', '🟡', '🟠'];
  const pollOptions = options.slice(0, optionCount);

  const embed = new EmbedBuilder()
    .setColor(0x9B59B6)
    .setTitle(`${emoji('survey')} ANKETA`)
    .setDescription(`${pollText}`)
    .addFields(
      ...pollOptions.map((opt, i) => ({
        name: `Opcija ${i + 1}`,
        value: `${opt} - 0 glasova`,
        inline: false
      }))
    )
    .setFooter({ text: `Glasove: ${message.author.tag}` })
    .setTimestamp();

  const row = new ActionRowBuilder()
    .addComponents(
      ...pollOptions.map((opt, i) =>
        new ButtonBuilder()
          .setCustomId(`poll_${i}`)
          .setLabel(`${opt}`)
          .setStyle(ButtonStyle.Secondary)
      )
    );

  const pollMsg = await message.reply({ embeds: [embed], components: [row] });

  const votes = {};
  pollOptions.forEach((_, i) => votes[i] = []);

  const collector = pollMsg.createMessageComponentCollector({ time: 300000 });

  collector.on('collect', async (interaction) => {
    const optionIndex = parseInt(interaction.customId.split('_')[1]);
    const userId = interaction.user.id;

    // Ukloni prethodni glas ako postoji
    for (const votedIndex in votes) {
      votes[votedIndex] = votes[votedIndex].filter(id => id !== userId);
    }

    // Dodaj novi glas
    votes[optionIndex].push(userId);

    // Ažuriraj embed
    const updatedEmbed = new EmbedBuilder()
      .setColor(0x9B59B6)
      .setTitle(`${emoji('survey')} ANKETA`)
      .setDescription(`${pollText}`)
      .addFields(
        ...pollOptions.map((opt, i) => ({
          name: `Opcija ${i + 1}`,
          value: `${opt} - ${votes[i].length} glasova`,
          inline: false
        }))
      )
      .setFooter({ text: `Ukupno glasova: ${Object.values(votes).flat().length}` })
      .setTimestamp();

    await interaction.update({ embeds: [updatedEmbed], components: [row] });
  });

  collector.on('end', async () => {
    const finalEmbed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle(`${emoji('tada')} ANKETA ZAVRŠENA`)
      .setDescription(`${pollText}`)
      .addFields(
        ...pollOptions.map((opt, i) => ({
          name: `Opcija ${i + 1}`,
          value: `${opt} - **${votes[i].length} glasova**`,
          inline: false
        }))
      )
      .setFooter({ text: `Ukupno glasova: ${Object.values(votes).flat().length}` })
      .setTimestamp();

    await pollMsg.edit({ embeds: [finalEmbed], components: [] });
  });
}