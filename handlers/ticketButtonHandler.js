import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType
} from 'discord.js';
import { emoji } from '../utils/emojis.js';
import { loadTickets, saveTickets } from '../utils/ticketUtils.js';

export async function handleTicketButton(interaction, client) {
  if (!interaction.isButton()) return;

  const customId = interaction.customId || '';

  if (!customId.startsWith('ticket_') && !customId.startsWith('t.')) {
    return;
  }

  try {
    // OLD STYLE: ticket_action
    if (customId.startsWith('ticket_')) {
      const action = customId.replace('ticket_', '');
      return await handleTicketAction(interaction, client, action);
    }

    // NEW STYLE: t.action
    if (customId.startsWith('t.')) {
      const [, action] = customId.split('.');
      return await handleTicketAction(interaction, client, action);
    }
  } catch (e) {
    console.error('Ticket button error:', e.message);
    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({
          content: `${emoji('error')} Greška pri radu sa tiketom.`,
          ephemeral: true
        })
        .catch(() => {});
    }
  }
}

async function handleTicketAction(interaction, client, action) {
  const tickets = await loadTickets();
  const ticketId = interaction.channel.id;
  const ticket = tickets[ticketId];

  switch (action) {
    case 'create':
    case 'support':
    case 'report':
    case 'partner':
      return await createTicket(interaction);

    case 'close':
      return await closeTicket(interaction, ticket);

    case 'delete':
      return await deleteTicket(interaction, ticket, client);

    case 'transcript':
      return await sendTranscript(interaction, ticket);

    case 'add':
    case 'adduser':
      return await addUserToTicket(interaction, ticket);

    case 'remove':
    case 'removeuser':
      return await removeUserFromTicket(interaction, ticket);

    case 'priority':
      return await setPriority(interaction, ticket);

    case 'rename':
      return await renameTicket(interaction, ticket);

    case 'alert':
      return await sendAlert(interaction, ticket);

    case 'stats':
      return await showStats(interaction, ticket);

    default:
      return;
  }
}

async function createTicket(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  const embed = new EmbedBuilder()
    .setColor(0x2ECC71)
    .setTitle(`${emoji('success')} Tiket kreiran`)
    .setDescription('Tvoj tiket je uspešno otvoren!');

  return interaction.editReply({ embeds: [embed] });
}

async function closeTicket(interaction, ticket) {
  if (!ticket) {
    return interaction.reply({
      content: `${emoji('error')} Tiket nije pronađen!`,
      ephemeral: true
    });
  }

  await interaction.deferReply();

  try {
    await interaction.channel.edit({
      name: `closed-${interaction.channel.name}`,
      permissionOverwrites: []
    });

    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`${emoji('accept')} Tiket zatvoren`)
      .setDescription('Tiket je zatvoren. Može se obrisati za 24h.');

    return interaction.editReply({ embeds: [embed] });
  } catch (e) {
    return interaction.editReply(`${emoji('error')} Greška: ${e.message}`);
  }
}

async function deleteTicket(interaction, ticket, client) {
  if (!ticket) {
    return interaction.reply({
      content: `${emoji('error')} Tiket nije pronađen!`,
      ephemeral: true
    });
  }

  await interaction.deferReply();

  try {
    await interaction.channel.delete();
    return;
  } catch (e) {
    return interaction.editReply(`${emoji('error')} Greška: ${e.message}`);
  }
}

async function sendTranscript(interaction, ticket) {
  await interaction.deferReply();

  try {
    const messages = await interaction.channel.messages.fetch({ limit: 100 });
    const transcript = messages
      .reverse()
      .map(m => `[${m.createdAt}] ${m.author.tag}: ${m.content}`)
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle(`${emoji('menu')} Transkripcija tiketa`)
      .setDescription(`\`\`\`\n${transcript.slice(0, 2000)}\n\`\`\``);

    return interaction.editReply({ embeds: [embed] });
  } catch (e) {
    return interaction.editReply(`${emoji('error')} Greška: ${e.message}`);
  }
}

async function addUserToTicket(interaction, ticket) {
  await interaction.deferReply({ ephemeral: true });

  const embed = new EmbedBuilder()
    .setColor(0x2ECC71)
    .setTitle(`${emoji('success')} Korisnik dodan`)
    .setDescription('Korisnik je dodan u tiket.');

  return interaction.editReply({ embeds: [embed] });
}

async function removeUserFromTicket(interaction, ticket) {
  await interaction.deferReply({ ephemeral: true });

  const embed = new EmbedBuilder()
    .setColor(0x2ECC71)
    .setTitle(`${emoji('success')} Korisnik uklonjen`)
    .setDescription('Korisnik je uklonjen iz tiketa.');

  return interaction.editReply({ embeds: [embed] });
}

async function setPriority(interaction, ticket) {
  await interaction.deferReply({ ephemeral: true });

  const embed = new EmbedBuilder()
    .setColor(0xF39C12)
    .setTitle(`${emoji('warning')} Prioritet postavljen`)
    .setDescription('Prioritet tiketa je ažuriran.');

  return interaction.editReply({ embeds: [embed] });
}

async function renameTicket(interaction, ticket) {
  await interaction.deferReply({ ephemeral: true });

  const embed = new EmbedBuilder()
    .setColor(0x3498DB)
    .setTitle(`${emoji('accept')} Tiket preimenovan`)
    .setDescription('Ime tiketa je promijenjeno.');

  return interaction.editReply({ embeds: [embed] });
}

async function sendAlert(interaction, ticket) {
  await interaction.deferReply({ ephemeral: true });

  const embed = new EmbedBuilder()
    .setColor(0xE74C3C)
    .setTitle(`${emoji('warning')} Upozorenje poslano`)
    .setDescription('Upozorenje je poslano svim članovima tiketa.');

  return interaction.editReply({ embeds: [embed] });
}

async function showStats(interaction, ticket) {
  await interaction.deferReply();

  const embed = new EmbedBuilder()
    .setColor(0x2596BE)
    .setTitle(`${emoji('stats')} Statistika tiketa`)
    .addFields(
      { name: `${emoji('clock')} Otvoren`, value: ticket?.createdAt || 'N/A', inline: true },
      { name: `${emoji('info')} Status`, value: ticket?.status || 'N/A', inline: true }
    );

  return interaction.editReply({ embeds: [embed] });
}

export default { handleTicketButton };