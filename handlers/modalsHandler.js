// handlers/modalsHandler.js
import { EmbedBuilder } from 'discord.js';
import Embeds from '../utils/embeds.js';
import { findReport, updateReportStatus, patchReport } from './reportsHandler.js';
import { addWarn } from './warnsHandler.js';
import { emoji } from '../utils/emojis.js';

function parseDurationToMs(str) {
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  const unit = match[2];
  const map = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return n * (map[unit] || 0);
}

function buildActionEmbed(action, report, moderatorTag, embedsUtil, extra = {}) {
  // use Embeds helper for consistency
  const extraFields = [];
  if (extra.reason) extraFields.push({ name: `${emoji('info')} Razlog`, value: extra.reason, inline: false });
  if (extra.duration) extraFields.push({ name: '⏱️ Trajanje', value: extra.duration, inline: true });
  if (extra.warnId) extraFields.push({ name: '⚠️ Warn ID', value: String(extra.warnId), inline: true });

  const titleMap = { ban: 'Korisnik Banovan', kick: 'Korisnik Uklonjen', timeout: 'Korisnik Timeout', warn: 'Korisnik Upozoren' };
  const colorMap = { ban: 0xE74C3C, kick: 0xF39C12, timeout: 0xFF4444, warn: 0xFFD700 };

  return embedsUtil.custom({
    title: `${(action === 'ban' && emoji('reject')) || (action === 'kick' && emoji('tada')) || (action === 'timeout' && emoji('clock')) || (emoji('warn'))} ${titleMap[action] || 'Akcija izvršena'}`,
    description: `Prijava ID: ${report.id}`,
    color: colorMap[action] || 0x2596BE,
    fields: [
      { name: `${emoji('stats')} Moderator`, value: moderatorTag, inline: true },
      { name: `${emoji('stats')} Prijavljeni korisnik`, value: report.reportedUser || 'Unknown', inline: true },
      { name: '📊 Status', value: action.toUpperCase(), inline: true },
      ...extraFields
    ]
  });
}

export async function handleModalSubmit(interaction) {
  if (!interaction.isModalSubmit?.()) return;
  const custom = interaction.customId; // e.g. modal_ban_<reportId>  OR modal_timeout_<reportId>_<duration>
  if (!custom?.startsWith('modal_')) return;

  const embedsUtil = new Embeds(interaction.client);

  const parts = custom.split('_');
  const action = parts[1]; // ban | kick | timeout | warn
  const reportId = parts[2];
  const duration = parts[3] || null; // for timeout

  const reason = interaction.fields.getTextInputValue('reason') || 'Bez razloga';

  const report = await findReport(reportId);
  if (!report) {
    await interaction.reply({ content: `${emoji('error')} Prijava nije pronađena.`, ephemeral: true });
    return;
  }

  const guild = interaction.guild;
  const userId = report.reportedUserId;
  const member = await guild.members.fetch(userId).catch(() => null);

// Permission checks
if (!member) {
  return interaction.reply({ 
    content: `${emoji('error')} Korisnik nije na serveru.`,
    ephemeral: true 
  });
}

if (!member.manageable || !member.moderatable) {
  return interaction.reply({
    content: `${emoji('error')} Ne mogu izvršiti akciju nad ovim korisnikom (verovatno je vlasnik, ima viši role ili bot nema dovoljne dozvole).`,
    ephemeral: true
  });
}

  try {
    if (action === 'ban') {
      if (!member) throw new Error('Korisnik nije na serveru');
      await member.ban({ reason });
      await updateReportStatus(reportId, 'BANNED', interaction.user.tag);
      await patchReport(reportId, { moderatedBy: interaction.user.tag, moderatedAt: new Date().toISOString(), actionTaken: 'ban', actionReason: reason });

      // DM user
      try { await member.user.send({ embeds: [embedsUtil.ban('BANOVAN/NA SI', { user: member.user, reason, author: interaction.user })] }); } catch {}
    } else if (action === 'kick') {
      if (!member) throw new Error('Korisnik nije na serveru');
      await member.kick(reason);
      await updateReportStatus(reportId, 'KICKED', interaction.user.tag);
      await patchReport(reportId, { moderatedBy: interaction.user.tag, moderatedAt: new Date().toISOString(), actionTaken: 'kick', actionReason: reason });

      try { await member.user.send({ embeds: [embedsUtil.kick('UKLONJEN/NA SI', { user: member.user, reason, author: interaction.user })] }); } catch {}
    } else if (action === 'timeout') {
      if (!member) throw new Error('Korisnik nije na serveru');
      if (!duration) throw new Error('Trajanje nije odabrano.');
      const ms = parseDurationToMs(duration);
      if (!ms) throw new Error('Nevalidno trajanje.');
      await member.timeout(ms, reason);
      await updateReportStatus(reportId, 'TIMEDOUT', interaction.user.tag);
      await patchReport(reportId, { moderatedBy: interaction.user.tag, moderatedAt: new Date().toISOString(), actionTaken: 'timeout', actionReason: reason, actionDuration: duration });

      try { await member.user.send({ embeds: [embedsUtil.timeout('NA TIMEOUT-U SI', { user: member.user, duration, reason, author: interaction.user })] }); } catch {}
    } else if (action === 'warn') {
      const warn = await addWarn(guild.id, userId, reason, interaction.user.tag);
      await updateReportStatus(reportId, 'WARNED', interaction.user.tag);
      await patchReport(reportId, { moderatedBy: interaction.user.tag, moderatedAt: new Date().toISOString(), actionTaken: 'warn', actionReason: reason, warnId: warn?.id || null });

      try { await member?.user?.send({ embeds: [embedsUtil.warn('UPOZOREN/NA SI', { user: member.user, reason, count: warn?.id || 1, author: interaction.user })] }); } catch {}
    } else {
      await interaction.reply({ content: `${emoji('error')} Nepoznata akcija.`, ephemeral: true });
      return;
    }
  } catch (e) {
    console.error('Modal action error:', e);
    await interaction.reply({ content: `${emoji('error')} Greška pri izvršenju akcije: ${e.message}`, ephemeral: true });
    return;
  }

  // Update the embed in the original report message (if exists)
  try {
    const channelId = report.reportChannelId || interaction.channelId;
    const messageId = report.reportMessageId || null;
    const channel = await interaction.client.channels.fetch(channelId).catch(() => null);
    if (channel && messageId) {
      const msg = await channel.messages.fetch(messageId).catch(() => null);
      if (msg) {
    const actionEmbed = buildActionEmbed(action, report, interaction.user.tag, embedsUtil, { 
    reason, 
    duration, 
    warnId: action === 'warn' ? (warn?.id || null) : null 
});

        await msg.edit({ embeds: [actionEmbed], components: [] });
      }
    }
  } catch (e) {
    console.error('Failed to update original report message embed:', e);
  }

  await interaction.reply({ content: `Akcija ${action.toUpperCase()} izvršena.`, ephemeral: true });
}
