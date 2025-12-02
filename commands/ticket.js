const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({ ticketId: { type: String, required: true, unique: true }, userId: { type: String, required: true }, channelId: { type: String, required: true }, status: { type: String, default: 'open' }, createdAt: { type: Date, default: Date.now } }, { collection: 'tickets' });
const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', TicketSchema);

module.exports = {
  data: new SlashCommandBuilder().setName('ticket').setDescription('Create a ticket'),
  async executeMessage(message) { await run({ type: 'message', message }); },
  async executeInteraction(interaction) { await interaction.deferReply(); await run({ type: 'interaction', interaction }); }
};

async function run({ type, message, interaction }) {
  const ctx = type === 'message' ? message : interaction;
  const guild = ctx.guild || (type === 'interaction' ? interaction.guild : null);
  if (!guild) {
    const txt = 'Ova komanda radi samo na serveru.';
    if (type === 'message') return message.reply(txt);
    return interaction.editReply({ content: txt });
  }
  const ticketChannel = await guild.channels.create({ name: `ticket-${(type === 'message' ? message.author.username : interaction.user.username).toLowerCase()}`, type: 0 });
  const ticket = await Ticket.create({ ticketId: `t-${Date.now()}`, userId: (type === 'message' ? message.author.id : interaction.user.id), channelId: ticketChannel.id });
  const embed = new EmbedBuilder().setTitle('Ticket otvoren').setDescription('Naši admini će uskoro odgovoriti.').setColor('Blue');
  ticketChannel.send({ content: `<@${ticket.userId}>`, embeds: [embed] });
  if (type === 'message') return message.reply('Ticket kreiran!');
  return interaction.editReply({ content: 'Ticket kreiran!' });
}