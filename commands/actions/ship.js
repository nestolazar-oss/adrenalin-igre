const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const gifs = require('../../utils/gifs');
const emojis = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ship')
    .setDescription('Ship two users')
    .addUserOption(o => o.setName('a').setDescription('User A').setRequired(true))
    .addUserOption(o => o.setName('b').setDescription('User B').setRequired(true)),
  async executeMessage(message, args) {
    const mentions = message.mentions.users.map(u => u);
    if (mentions.length < 2) return message.reply('Označi dva korisnika.');
    return run({ type: 'message', message, a: mentions[0], b: mentions[1] });
  },
  async executeInteraction(interaction) {
    await interaction.deferReply();
    const a = interaction.options.getUser('a');
    const b = interaction.options.getUser('b');
    return run({ type: 'interaction', interaction, a, b });
  }
};

async function run({ type, message, interaction, a, b }) {
  const percent = Math.floor(Math.random() * 100) + 1;
  const gif = gifs.randomFrom('ship');
  const embed = new EmbedBuilder().setTitle(`Ship ${a.username} ❤ ${b.username}`)
    .setDescription(`Compatibility: ${percent}%`)
    .setImage(gif)
    .setColor('Random')
    .setFooter({ text: emojis.ship });

  if (type === 'message') return message.channel.send({ embeds: [embed] });
  return interaction.editReply({ embeds: [embed] });
}