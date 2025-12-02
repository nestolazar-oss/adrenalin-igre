const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const gifs = require('../../utils/gifs');
const emojis = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kiss')
    .setDescription('Kiss someone')
    .addUserOption(opt => opt.setName('target').setDescription('Koga ljubiš').setRequired(false)),
  async executeMessage(message, args) {
    const target = message.mentions.users.first();
    return run({ type: 'message', message, target });
  },
  async executeInteraction(interaction) {
    await interaction.deferReply();
    const target = interaction.options.getUser('target');
    return run({ type: 'interaction', interaction, target });
  }
};

async function run({ type, message, interaction, target }) {
  const actor = type === 'message' ? message.author : interaction.user;
  const targetUser = target || (type === 'message' ? message.author : interaction.user);
  const gif = gifs.randomFrom('kiss');
  const embed = new EmbedBuilder().setTitle(`${actor.username} kisses ${targetUser.username}`)
    .setImage(gif)
    .setColor('Pink')
    .setFooter({ text: emojis.kiss });

  if (type === 'message') return message.channel.send({ embeds: [embed] });
  return interaction.editReply({ embeds: [embed] });
}