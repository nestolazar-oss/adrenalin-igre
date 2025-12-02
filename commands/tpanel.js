const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('tpanel').setDescription('Post ticket panel'),
  async executeMessage(message) { await run({ type: 'message', message }); },
  async executeInteraction(interaction) { await interaction.deferReply(); await run({ type: 'interaction', interaction }); }
};

async function run({ type, message, interaction }) {
  const ctx = type === 'message' ? message : interaction;
  const member = ctx.member || (type === 'interaction' ? interaction.member : null);
  if (!member?.permissions?.has('ManageGuild')) {
    const txt = 'Nemaš permisiju.';
    if (type === 'message') return message.reply(txt);
    return interaction.editReply({ content: txt });
  }
  const embed = new EmbedBuilder().setTitle('Ticket panel').setDescription('Klikni dugme da otvoriš ticket.').setColor('Purple');
  const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('open_ticket').setLabel('Open Ticket').setStyle(ButtonStyle.Success));
  if (type === 'message') {
    await message.channel.send({ embeds: [embed], components: [row] });
    return message.reply('Panel postavljen!');
  }
  await interaction.editReply({ embeds: [embed], components: [row] });
}