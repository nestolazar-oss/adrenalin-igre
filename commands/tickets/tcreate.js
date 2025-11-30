// commands/tickets/tcreate.js
import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits
} from 'discord.js';
import { loadTickets, saveTickets } from '../../utils/ticketUtils.js';
import fs from 'fs';

const STAFF_ROLE_ID = process.env.TICKET_STAFF_ROLE_ID || 'STAFF_ROLE_ID';
const CATEGORY_IDS = (process.env.TICKET_CATEGORY_IDS || '').split(',').map(s=>s.trim()).filter(Boolean);
const MAX_OPEN = parseInt(process.env.TICKET_MAX_OPEN_PER_USER || '2', 10);

export const name = 'ticket_create_handler'; // not a command, used by interactionCreate listener

export async function handleTicketCreate(interaction) {
  if (!interaction.isButton()) return;
  const id = interaction.customId;
  if (!['ticket_support','ticket_report','ticket_partner'].includes(id)) return;

  const tickets = loadTickets();

  const userOpenCount = Object.values(tickets.channels).filter(t => t.opener === interaction.user.id && t.status === 'open').length;
  if (userOpenCount >= MAX_OPEN) {
    return interaction.reply({ content: `${global.emoji('warning')} Ne možeš imati više od ${MAX_OPEN} otvorenih ticketa.`, ephemeral: true });
  }

  // category rotation: find first category with least channels (or just first)
  let parent = null;
  if (CATEGORY_IDS.length) {
    // choose first valid category that exists
    for (const cid of CATEGORY_IDS) {
      const cat = interaction.guild.channels.cache.get(cid);
      if (cat && cat.type === 4) { parent = cid; break; }
    }
  }

  const safeName = `ticket-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9\\-]/g,'-').slice(0,90);
  const channel = await interaction.guild.channels.create({
    name: safeName,
    type: 0,
    parent: parent || null,
    permissionOverwrites: [
      { id: interaction.guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
      { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] }
    ]
  });

  // save
  tickets.channels[channel.id] = {
    opener: interaction.user.id,
    openedAt: Date.now(),
    status: 'open',
    type: id.replace('ticket_',''),
    priority: 'medium',
    members: []
  };
  tickets.users[interaction.user.id] = channel.id;
  saveTickets(tickets);

  // buttons
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji(global.emoji('reject')),
    new ButtonBuilder().setCustomId('ticket_transcript').setLabel('Transcript').setStyle(ButtonStyle.Secondary).setEmoji(global.emoji('stats')),
    new ButtonBuilder().setCustomId('ticket_delete').setLabel('Delete').setStyle(ButtonStyle.Secondary).setEmoji(global.emoji('error')),
    new ButtonBuilder().setCustomId('ticket_adduser').setLabel('Add Member').setStyle(ButtonStyle.Primary).setEmoji(global.emoji('accept')),
    new ButtonBuilder().setCustomId('ticket_removeuser').setLabel('Remove Member').setStyle(ButtonStyle.Secondary).setEmoji(global.emoji('reject')),
    new ButtonBuilder().setCustomId('ticket_priority').setLabel('Priority').setStyle(ButtonStyle.Secondary).setEmoji(global.emoji('fire')),
    new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setStyle(ButtonStyle.Success).setEmoji(global.emoji('tada'))
  );

  const embed = new EmbedBuilder()
    .setTitle(`${global.emoji('tada')} Novi ticket`)
    .setDescription(`Tip: **${tickets.channels[channel.id].type}**\nOtvorio: <@${interaction.user.id}>`)
    .setColor(0x2596BE)
    .setTimestamp();

  await channel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [row] });
  await interaction.reply({ content: `${global.emoji('success')} Ticket kreiran: <#${channel.id}>`, ephemeral: true });
}
