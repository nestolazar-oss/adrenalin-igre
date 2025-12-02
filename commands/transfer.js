const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { transfer } = require('../utils/economy');

module.exports = {
  data: new SlashCommandBuilder().setName('transfer').setDescription('Transfer money to another user').addUserOption(o => o.setName('to').setDescription('Recipient').setRequired(true)).addNumberOption(o => o.setName('amount').setDescription('Amount').setRequired(true)),
  async executeMessage(message, args) { const target = message.mentions.users.first(); const amount = Number(args[1]); if (!target || !Number.isFinite(amount)) return message.reply('Označi korisnika i iznos.'); await run({ type: 'message', message, target, amount }); },
  async executeInteraction(interaction) { await interaction.deferReply(); const target = interaction.options.getUser('to'); const amount = interaction.options.getNumber('amount'); await run({ type: 'interaction', interaction, target, amount }); }
};

async function run({ type, message, interaction, target, amount }) {
  try {
    await transfer(type === 'message' ? message.author.id : interaction.user.id, target.id, amount);
    const embed = new EmbedBuilder().setDescription(`Poslato ${amount}€ korisniku ${target.tag || target.username}`).setColor('Green');
    if (type === 'message') return message.channel.send({ embeds: [embed] });
    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    const embed = new EmbedBuilder().setDescription(`Transfer nije uspeo: ${err.message}`).setColor('Red');
    if (type === 'message') return message.channel.send({ embeds: [embed] });
    return interaction.editReply({ embeds: [embed] });
  }
}