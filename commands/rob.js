const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, safeInc, transfer } = require('../utils/economy');

module.exports = {
  data: new SlashCommandBuilder().setName('rob').setDescription('Rob another user').addUserOption(o => o.setName('target').setDescription('Target')),
  async executeMessage(message) { const target = message.mentions.users.first(); await run({ type: 'message', message, target }); },
  async executeInteraction(interaction) { await interaction.deferReply(); const target = interaction.options.getUser('target'); await run({ type: 'interaction', interaction, target }); }
};

async function run({ type, message, interaction, target }) {
  const userId = type === 'message' ? message.author.id : interaction.user.id;
  const targetId = target ? target.id : null;
  if (!targetId) {
    const txt = 'Označi korisnika kojeg želiš da pljačkaš.';
    if (type === 'message') return message.reply(txt);
    return interaction.editReply({ content: txt });
  }
  if (targetId === userId) {
    const txt = 'Ne možeš pljačkati sebe.';
    if (type === 'message') return message.reply(txt);
    return interaction.editReply({ content: txt });
  }
  const targetUser = await getUser(targetId);
  const chance = Math.random();
  if (chance < 0.5) {
    const penalty = 100; await safeInc(userId, 'cash', -penalty);
    const embed = new EmbedBuilder().setDescription(`Neuspelo! Platio si kaznu ${penalty}€`).setColor('Red');
    if (type === 'message') return message.channel.send({ embeds: [embed] });
    return interaction.editReply({ embeds: [embed] });
  } else {
    const max = Math.max(0, targetUser.cash);
    const stolen = Math.floor(Math.random() * Math.min(300, max));
    if (stolen <= 0) {
      const txt = 'Nema šta da se ukrade.';
      if (type === 'message') return message.channel.send(txt);
      return interaction.editReply({ content: txt });
    }
    await transfer(targetId, userId, stolen);
    const embed = new EmbedBuilder().setDescription(`Uspesno si pokrao ${stolen}€`).setColor('Green');
    if (type === 'message') return message.channel.send({ embeds: [embed] });
    return interaction.editReply({ embeds: [embed] });
  }
}