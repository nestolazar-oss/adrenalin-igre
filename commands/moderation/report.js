import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import embeds from '../../utils/embeds.js';

const __dirname_report = path.dirname(fileURLToPath(import.meta.url));
const REPORT_FILE = path.join(__dirname_report, '../../data/reports.json');

async function ensureReportFile() {
  try {
    await fs.mkdir(path.dirname(REPORT_FILE), { recursive: true });
    try {
      await fs.access(REPORT_FILE);
    } catch {
      await fs.writeFile(REPORT_FILE, JSON.stringify([], null, 2));
    }
  } catch (e) {
    console.error('Report file error:', e);
  }
}

async function getReports() {
  await ensureReportFile();
  try {
    const data = await fs.readFile(REPORT_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveReports(reports) {
  await ensureReportFile();
  await fs.writeFile(REPORT_FILE, JSON.stringify(reports, null, 2));
}

export const meta_report = {
  name: 'report',
  description: 'Prijavi poruku kao spam/neodgovarajuću'
};

export async function execute_report(message, args) {
  const reportChannelId = process.env.REPORT_CHANNEL_ID;
  
  if (!reportChannelId) {
    return message.reply(embeds.error('Greška', `${emoji('error')} Report kanal nije konfigurisan!`));
  }

  const reportChannel = message.guild.channels.cache.get(reportChannelId);
  if (!reportChannel) {
    return message.reply(embeds.error('Greška', `${emoji('error')} Report kanal nije pronađen!`));
  }

  const targetMessage = await message.channel.messages.fetch(args[0]).catch(() => null);
  if (!targetMessage) {
    return message.reply(embeds.error('Greška', `${emoji('error')} Poruka nije pronađena! Koristi: \`-report <message_id> [razlog]\``));
  }

  const reason = args.slice(1).join(' ') || 'Bez razloga';
  const reportId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const report = {
    id: reportId,
    messageId: targetMessage.id,
    messageAuthor: targetMessage.author.tag,
    reporter: message.author.tag,
    reporterId: message.author.id,
    reason,
    messageContent: targetMessage.content.slice(0, 100),
    timestamp: new Date().toISOString(),
    status: 'PENDING'
  };

  const reports = await getReports();
  reports.push(report);
  await saveReports(reports);

  // Pošalji u report kanal
  const reportEmbed = new EmbedBuilder()
    .setColor(0xE74C3C)
    .setTitle(`${emoji('warning')} Nova Prijava`)
    .addFields(
      { name: `${emoji('info')} Prijavljivač`, value: `${message.author.tag}`, inline: true },
      { name: `${emoji('stats')} Autor Poruke`, value: `${targetMessage.author.tag}`, inline: true },
      { name: `${emoji('warning')} Razlog`, value: reason, inline: false },
      { name: `${emoji('chat')} Sadržaj Poruke`, value: `\`\`\`${targetMessage.content.slice(0, 100)}\`\`\``, inline: false },
      { name: `${emoji('tacka')} ID Prijave`, value: reportId, inline: true },
      { name: 'Status', value: 'PENDING', inline: true }
    )
    .setFooter({ text: `Message ID: ${targetMessage.id}` })
    .setTimestamp();

  const buttons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`report_approve_${reportId}`)
        .setLabel('Odobri')
        .setStyle(ButtonStyle.Success)
        .setEmoji(emoji('success')),
      new ButtonBuilder()
        .setCustomId(`report_reject_${reportId}`)
        .setLabel('Odbij')
        .setStyle(ButtonStyle.Danger)
        .setEmoji(emoji('reject')),
      new ButtonBuilder()
        .setCustomId(`report_delete_${reportId}`)
        .setLabel('Obriši Poruku')
        .setStyle(ButtonStyle.Secondary)
    );

  await reportChannel.send({ embeds: [reportEmbed], components: [buttons] });

  const userEmbed = new EmbedBuilder()
    .setColor(0x2ECC71)
    .setTitle(`${emoji('success')} Prijava Poslana`)
    .setDescription(`Prijavili ste poruku od ${targetMessage.author.tag}`)
    .addFields(
      { name: `${emoji('warning')} Razlog`, value: reason, inline: false },
      { name: `${emoji('tacka')} ID Prijave`, value: reportId, inline: true }
    )
    .setTimestamp();

  return message.reply({ embeds: [userEmbed] });
}

// Button handler za report sistem
export async function handleReportButtons(interaction) {
  if (!interaction.customId.startsWith('report_')) return;

  const OWNER_ID = process.env.OWNER_ID;
  if (interaction.user.id !== OWNER_ID && !interaction.member.permissions.has('ModerateMembers')) {
    return interaction.reply({ content: `${emoji('reject')} Nemaš dozvolu!`, ephemeral: true });
  }

  const [action, reportId] = interaction.customId.split('_').slice(0, 2);
  const reports = await getReports();
  const report = reports.find(r => r.id === reportId);

  if (!report) {
    return interaction.reply({ content: `${emoji('error')} Prijava nije pronađena!`, ephemeral: true });
  }

  if (action === 'approve') {
    report.status = 'APPROVED';
    report.approvedBy = interaction.user.tag;
    await saveReports(reports);

    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle(`${emoji('success')} Prijava Odobljena`)
      .setDescription(`ID: ${reportId}`)
      .addFields(
        { name: 'Moderator', value: interaction.user.tag, inline: true }
      );

    return interaction.update({ embeds: [embed], components: [] });
  }

  if (action === 'reject') {
    report.status = 'REJECTED';
    report.rejectedBy = interaction.user.tag;
    await saveReports(reports);

    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`${emoji('reject')} Prijava Odbijena`)
      .setDescription(`ID: ${reportId}`)
      .addFields(
        { name: 'Moderator', value: interaction.user.tag, inline: true }
      );

    return interaction.update({ embeds: [embed], components: [] });
  }

  if (action === 'delete') {
    try {
      const channel = interaction.guild.channels.cache.get(report.messageId.split('-')[0]);
      const msg = await channel?.messages.fetch(report.messageId).catch(() => null);
      
      if (msg) {
        await msg.delete();
      }

      report.status = 'DELETED';
      report.deletedBy = interaction.user.tag;
      await saveReports(reports);

      const embed = new EmbedBuilder()
        .setColor(0xE67E22)
        .setTitle(`${emoji('tada')} Poruka Obrisana`)
        .setDescription(`ID: ${reportId}`)
        .addFields(
          { name: 'Obrisao', value: interaction.user.tag, inline: true }
        );

      return interaction.update({ embeds: [embed], components: [] });
    } catch (e) {
      console.error('Delete error:', e);
      return interaction.reply({ content: `${emoji('error')} Nisam mogao obrisati poruku!`, ephemeral: true });
    }
  }
}