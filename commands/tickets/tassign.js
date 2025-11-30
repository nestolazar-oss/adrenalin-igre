// commands/tickets/tassign.js
import { loadTickets, saveTickets } from '../../utils/ticketUtils.js';
import { EmbedBuilder } from 'discord.js';

export const meta = { name: 'tassign', description: 'Dodeli ticket drugom staff-u' };

export async function execute(message, args) {
  const mention = message.mentions.users.first();
  if (!mention) return message.reply('Mentions staff user.');
  const tickets = loadTickets();
  const ticket = tickets.channels[message.channel.id];
  if (!ticket) return message.reply('Nije ticket kanal.');
  ticket.claimedBy = mention.id;
  saveTickets(tickets);
  await message.channel.send({ embeds: [new EmbedBuilder().setDescription(`${emoji('tada')} Ticket dodeljen <@${mention.id}>`).setColor(0x2596BE)] });
  return message.reply({ content: 'Assigned', ephemeral: true });
}
