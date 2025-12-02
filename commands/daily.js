const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, safeInc } = require('../utils/economy');

module.exports = {
  data: new SlashCommandBuilder().setName('daily').setDescription('Daily reward'),
  async executeMessage(message) { await run({ type: 'message', message }); },
  async executeInteraction(interaction) { await interaction.deferReply(); await run({ type: 'interaction', interaction }); }
};

async function run({ type, message, interaction }) {
  const userId = type === 'message' ? message.author.id : interaction.user.id;
  const user = await getUser(userId);
  const now = Date.now();
  const last = user.cooldowns?.daily ? new Date(user.cooldowns.daily).getTime() : 0;
  if (last + 1000 * 60 * 60 * 24 > now) {
    const txt = 'Daily već podignut. Probaj kasnije.';
    if (type === 'message') return message.reply(txt);
    return interaction.editReply({ content: txt });
  }
  const amount = 500; await safeInc(userId, 'cash', amount);
  user.cooldowns = user.cooldowns || {}; user.cooldowns.daily = new Date(); await user.save();
  const embed = new EmbedBuilder().setTitle('Daily').setDescription(`Dobili ste ${amount}€`).setColor('Blue');
  if (type === 'message') return message.channel.send({ embeds: [embed] });
  return interaction.editReply({ embeds: [embed] });
}