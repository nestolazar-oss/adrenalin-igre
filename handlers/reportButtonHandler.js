// handlers/reportButtonHandler.js
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder
} from 'discord.js';
import Embeds from '../utils/embeds.js';
import { findReport, updateReportStatus, patchReport } from './reportsHandler.js';
import { emoji } from '../utils/emojis.js';

const TIMEOUT_OPTIONS = [
  { label: '5 minuta', value: '5m' },
  { label: '10 minuta', value: '10m' },
  { label: '30 minuta', value: '30m' },
  { label: '1 sat', value: '1h' },
  { label: '6 sati', value: '6h' },
  { label: '12 sati', value: '12h' },
  { label: '1 dan', value: '1d' },
  { label: '7 dana', value: '7d' }
];

function buildApprovedEmbed(report, moderatorTag, client) {
  const emb = new Embeds(client);
  const fields = [
    { name: `${emoji('info')} Prijavljivač`, value: report.reporter || 'Unknown', inline: true },
    { name: `${emoji('stats')} Prijavljeni korisnik`, value: report.reportedUser || 'Unknown', inline: true },
    { name: '📊 Status', value: 'APPROVED', inline: true }
  ];

  if (report.messageContent) {
    fields.push({ name: `${emoji('chat')} Sadržaj poruke`, value: `\`\`\`${report.messageContent}\`\`\``, inline: false });
  }

  if (moderatorTag) fields.push({ name: `${emoji('stats')} Moderator`, value: moderatorTag, inline: true });

  return emb.custom({
    title: `${emoji('success')} Prijava Odobrena`,
    description: `Prijava ID: ${report.id}`,
    color: 0x2ECC71,
    fields
  });
}

export async function handleReportButtons(interaction) {
  if (!interaction.customId?.startsWith('report_')) return;

  const embeds = new Embeds(interaction.client);

  // perms
  const OWNER_ID = process.env.OWNER_ID;
  if (interaction.user.id !== OWNER_ID && !interaction.member.permissions.has('ModerateMembers')) {
    return interaction.reply({ content: `${emoji('reject')} Nemaš dozvolu!`, ephemeral: true });
  }

  const parts = interaction.customId.split('_');
  const action = parts[1]; // approve | reject | delete
  const reportId = parts.slice(2).join('_');

  const report = await findReport(reportId);

  if (!report) {
    return interaction.reply({ content: `${emoji('error')} Prijava nije pronađena!`, ephemeral: true });
  }

  try {
    if (action === 'approve') {
      await updateReportStatus(reportId, 'APPROVED', interaction.user.tag);
      await patchReport(reportId, { reportMessageId: interaction.message.id, reportChannelId: interaction.channelId });

      const embed = buildApprovedEmbed(report, interaction.user.tag, interaction.client);

      // Ban | Kick | Warn buttons
      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`mod_ban_${reportId}`).setLabel('Ban').setStyle(ButtonStyle.Danger).setEmoji(emoji('reject')),
        new ButtonBuilder().setCustomId(`mod_kick_${reportId}`).setLabel('Kick').setStyle(ButtonStyle.Secondary).setEmoji(emoji('tada')),
        new ButtonBuilder().setCustomId(`mod_warn_${reportId}`).setLabel('Warn').setStyle(ButtonStyle.Primary).setEmoji(emoji('warn'))
      );

      // Timeout select
      const select = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`mod_timeout_select_${reportId}`)
          .setPlaceholder('Timeout trajanje...')
          .setMinValues(1)
          .setMaxValues(1)
          .addOptions(TIMEOUT_OPTIONS.map(o => ({ label: o.label, value: o.value })))
      );

      // Add a cancel button row so moderator can revert if clicked by mistake
      const cancelRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`mod_cancel_${reportId}`).setLabel('Cancel').setStyle(ButtonStyle.Secondary)
      );

      await interaction.update({ embeds: [embed], components: [buttons, select, cancelRow] });
      return;
    }

    if (action === 'reject') {
      await updateReportStatus(reportId, 'REJECTED', interaction.user.tag);

      const embed = embeds.custom({
        title: `${emoji('reject')} Prijava Odbijena`,
        description: `ID: ${reportId}`,
        color: 0xE74C3C,
        fields: [{ name: `${emoji('stats')} Moderator`, value: interaction.user.tag, inline: true }]
      });

      return interaction.update({ embeds: [embed], components: [] });
    }

    if (action === 'delete') {
      try {
        if (report.messageId) {
          const channel = interaction.channel;
          const msg = await channel.messages.fetch(report.messageId).catch(() => null);
          if (msg) await msg.delete();
        }

        await updateReportStatus(reportId, 'DELETED', interaction.user.tag);

        const embed = embeds.custom({
          title: `${emoji('tada')} Poruka Obrisana`,
          description: `ID: ${reportId}`,
          color: 0xE67E22,
          fields: [{ name: `${emoji('stats')} Obrisao`, value: interaction.user.tag, inline: true }]
        });

        return interaction.update({ embeds: [embed], components: [] });
      } catch (e) {
        console.error('Delete error:', e);
        return interaction.reply({ content: `${emoji('error')} Nisam mogao obrisati poruku!`, ephemeral: true });
      }
    }
  } catch (e) {
    console.error('Report button error:', e);
    return interaction.reply({ content: `${emoji('error')} Greška pri obradi prijave!`, ephemeral: true });
  }
}

/**
 * Handle moderation buttons (Ban/Kick/Warn) and timeout select
 * This function should be called from central interactionCreate when customIds start with mod_ or mod_timeout_select_
 */
export async function handleModInteraction(interaction) {
  if (!interaction.customId) return;

  const embeds = new Embeds(interaction.client);

  // check perms again
  const OWNER_ID = process.env.OWNER_ID;
  if (interaction.user.id !== OWNER_ID && !interaction.member.permissions.has('ModerateMembers')) {
    return interaction.reply({ content: `${emoji('reject')} Nemaš dozvolu!`, ephemeral: true });
  }

  // Ban/Kick/Warn buttons: mod_ban_<reportId>, mod_kick_<reportId>, mod_warn_<reportId>
  if (interaction.customId.startsWith('mod_ban_') || interaction.customId.startsWith('mod_kick_') || interaction.customId.startsWith('mod_warn_') || interaction.customId.startsWith('mod_cancel_')) {
    const parts = interaction.customId.split('_');
    const action = parts[1]; // ban | kick | warn | cancel
    const reportId = parts.slice(2).join('_');

    if (action === 'cancel') {
      // revert to original approved embed (just mark as APPROVED and re-add buttons)
      const report = await findReport(reportId);
      if (!report) return interaction.reply({ content: `${emoji('error')} Prijava nije pronađena!`, ephemeral: true });
      await updateReportStatus(reportId, 'APPROVED', interaction.user.tag);
      await patchReport(reportId, { reportMessageId: interaction.message.id, reportChannelId: interaction.channelId });

      const embed = buildApprovedEmbed(report, interaction.user.tag, interaction.client);
      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`mod_ban_${reportId}`).setLabel('Ban').setStyle(ButtonStyle.Danger).setEmoji(emoji('reject')),
        new ButtonBuilder().setCustomId(`mod_kick_${reportId}`).setLabel('Kick').setStyle(ButtonStyle.Secondary).setEmoji(emoji('tada')),
        new ButtonBuilder().setCustomId(`mod_warn_${reportId}`).setLabel('Warn').setStyle(ButtonStyle.Primary).setEmoji(emoji('warn'))
      );
      const select = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`mod_timeout_select_${reportId}`)
          .setPlaceholder('Timeout trajanje...')
          .setMinValues(1)
          .setMaxValues(1)
          .addOptions(TIMEOUT_OPTIONS.map(o => ({ label: o.label, value: o.value })))
      );
      const cancelRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`mod_cancel_${reportId}`).setLabel('Cancel').setStyle(ButtonStyle.Secondary)
      );

      return interaction.update({ embeds: [embed], components: [buttons, select, cancelRow] });
    }

    // For ban/kick/warn open reason modal
    const modal = new ModalBuilder()
      .setCustomId(`modal_${action}_${reportId}`)
      .setTitle(`${action.toUpperCase()} - Unesi razlog`);

    const input = new TextInputBuilder()
      .setCustomId('reason')
      .setLabel('Razlog')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setPlaceholder('Unesi razlog...');

    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);

    return interaction.showModal(modal);
  }

  // Timeout select chosen -> customId = mod_timeout_select_<reportId>
  if (interaction.customId.startsWith('mod_timeout_select_') && interaction.isStringSelectMenu?.()) {
    const reportId = interaction.customId.split('_').slice(3).join('_');
    const duration = interaction.values && interaction.values[0];
    if (!duration) return interaction.reply({ content: `${emoji('error')} Nije izabrano trajanje.`, ephemeral: true });

    // Open modal for timeout reason. We'll encode duration into customId so modal handler knows duration.
    const modal = new ModalBuilder()
      .setCustomId(`modal_timeout_${reportId}_${duration}`)
      .setTitle(`Timeout ${duration} - Unesi razlog`);

    const input = new TextInputBuilder()
      .setCustomId('reason')
      .setLabel('Razlog')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setPlaceholder('Unesi razlog za timeout...');

    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);

    return interaction.showModal(modal);
  }
}
