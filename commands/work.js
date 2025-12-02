const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, safeInc } = require('../utils/economy');

module.exports = {
  data: new SlashCommandBuilder().setName('work').setDescription('Work to earn money'),
  async executeMessage(message) { await run({ type: 'message', message }); },
  async executeInteraction(interaction) { await interaction.deferReply(); await run({ type: 'interaction', interaction }); }
};

async function run({ type, message, interaction }) {
  const userId = type === 'message' ? message.author.id : interaction.user.id;
  const user = await getUser(userId);
  const now = Date.now();
  if (user.cooldowns?.work && new Date(user.cooldowns.work).getTime() + 1000 * 60 * 5 > now) {
    const txt = 'Još si na cooldownu za work.';
    if (type === 'message') return message.reply(txt);
    return interaction.editReply({ content: txt });
  }
  const earned = Math.floor(Math.random() * 300) + 50;
  await safeInc(userId, 'cash', earned);
  user.cooldowns = user.cooldowns || {}; user.cooldowns.work = new Date(); await user.save();
  const embed = new EmbedBuilder().setTitle('Work').setDescription(`Zaradili ste ${earned}€`).setColor('Green');
  if (type === 'message') return message.channel.send({ embeds: [embed] });
  return interaction.editReply({ embeds: [embed] });
}