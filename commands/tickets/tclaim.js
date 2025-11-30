// commands/tickets/tclaim.js
import { loadTickets, saveTickets } from '../../utils/ticketUtils.js';
import { EmbedBuilder } from 'discord.js';

export const meta = { name: 'tclaim', description: 'Preuzmi ticket (staff)' };

export async function execute(message, args) {
  const tickets = loadTickets();
  const tid = message.channel.id;
  const ticket = tickets.channels[tid];
  if (!ticket) return message.reply('Ovo nije ticket kanal.');
  const staffId = message.author.id;
  ticket.claimedBy = staffId;
  ticket.claimedAt = Date.now();
  saveTickets(tickets);
  const embed = new EmbedBuilder().setDescription(`${emoji('tada')} <@${staffId}> je preuzeo ticket.`).setColor(0x2ecc71);
  await message.channel.send({ embeds: [embed] });
  return message.reply({ content: 'Claimed', ephemeral: true });
}
