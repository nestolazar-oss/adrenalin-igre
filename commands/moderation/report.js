import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { addReport } from '../../handlers/reportsHandler.js';
import Embeds from '../../utils/embeds.js';
import { emoji } from '../../utils/emojis.js';

export const meta = {
  name: 'report',
  aliases: ['prijavi'],
  description: 'Prijavi korisnika ili poruku'
};

export async function execute(message, args) {
  const reportChannelId = process.env.REPORT_CHANNEL_ID;

  const embeds = new Embeds(message.client);

  if (!reportChannelId) {
    return message.reply({
      embeds: [embeds.error('Greška', `${emoji('error')} Report kanal nije konfigurisan!`)]
    });
  }

  const reportChannel = message.guild.channels.cache.get(reportChannelId);
  if (!reportChannel) {
    return message.reply({
      embeds: [embeds.error('Greška', `${emoji('error')} Report kanal nije pronađen!`)]
    });
  }

  // SCENARIO 1: Reply na poruku sa &report
  if (message.reference) {
    try {
      const repliedTo = await message.channel.messages.fetch(message.reference.messageId);
      const reason = args.join(' ') || 'Bez razloga';
      const reportId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Siguran sadržaj poruke (fallback ako nema text content)
      const messageContentShort = repliedTo.content ? repliedTo.content.slice(0, 100) : '[Nema tekstualnog sadržaja]';

      const report = {
        id: reportId,
        type: 'message',
        messageId: repliedTo.id,
        messageContent: messageContentShort,
        reportedUser: repliedTo.author.tag,
        reportedUserId: repliedTo.author.id,
        reporter: message.author.tag,
        reporterId: message.author.id,
        reason,
        timestamp: new Date().toISOString(),
        status: 'PENDING'
      };

      await addReport(report);

      // Pošalji u report kanal
      const reportEmbed = embeds.custom({
        title: `${emoji('warning')} Nova Prijava - Poruka`,
        description: `Korisnik ${message.author.tag} je prijavio poruku od ${repliedTo.author.tag}`,
        color: 0xE74C3C,
        fields: [
          { name: `${emoji('info')} Prijavljivač`, value: message.author.tag, inline: true },
          { name: `${emoji('stats')} Prijavljeni korisnik`, value: repliedTo.author.tag, inline: true },
          { name: `${emoji('warning')} Razlog`, value: reason, inline: false },
          { name: `${emoji('chat')} Sadržaj poruke`, value: `\`\`\`${messageContentShort}\`\`\``, inline: false },
          { name: `${emoji('tacka')} ID Prijave`, value: reportId, inline: true },
          { name: '📊 Status', value: 'PENDING', inline: true }
        ]
      });

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

      const userEmbed = embeds.custom({
        title: `${emoji('success')} Prijava Poslana`,
        description: `Prijavili ste poruku od ${repliedTo.author.tag}`,
        color: 0x2ECC71,
        fields: [
          { name: `${emoji('warning')} Razlog`, value: reason, inline: false },
          { name: `${emoji('tacka')} ID Prijave`, value: reportId, inline: true }
        ]
      });

      return message.reply({ embeds: [userEmbed] });
    } catch (e) {
      console.error('Report (reply) error:', e);
      return message.reply({
        embeds: [embeds.error('Greška', `${emoji('error')} Nisam mogao učitati poruku!`)]
      });
    }
  }

  // SCENARIO 2: &report @user/ID razlog
  if (!args[0]) {
    return message.reply({
      embeds: [embeds.error('Greška', `${emoji('error')} Koristi: \`-report <@user ili ID> [razlog]\` ili reply na poruku sa \`-report\``)]
    });
  }

  const userInput = args[0];
  const reason = args.slice(1).join(' ') || 'Bez razloga';
  const reportId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Pronađi korisnika
  let reportedUser = null;
  
  // Ako je mention
  const mention = userInput.match(/<@!?(\d+)>/);
  if (mention) {
    try {
      reportedUser = await message.client.users.fetch(mention[1]);
    } catch (err) {
      return message.reply({
        embeds: [embeds.error('Greška', `${emoji('error')} Korisnik nije pronađen!`)]
      });
    }
  }
  // Ako je ID
  else if (/^\d+$/.test(userInput)) {
    try {
      reportedUser = await message.client.users.fetch(userInput);
    } catch (err) {
      return message.reply({
        embeds: [embeds.error('Greška', `${emoji('error')} Korisnik nije pronađen!`)]
      });
    }
  } else {
    return message.reply({
      embeds: [embeds.error('Greška', `${emoji('error')} Koristi mention ili ID korisnika!`)]
    });
  }

  const report = {
    id: reportId,
    type: 'user',
    reportedUser: reportedUser.tag,
    reportedUserId: reportedUser.id,
    reporter: message.author.tag,
    reporterId: message.author.id,
    reason,
    timestamp: new Date().toISOString(),
    status: 'PENDING'
  };

  await addReport(report);

  // Pošalji u report kanal
  const reportEmbed = embeds.custom({
    title: `${emoji('warning')} Nova Prijava - Korisnik`,
    description: `Korisnik ${message.author.tag} je prijavio ${reportedUser.tag}`,
    color: 0xE74C3C,
    fields: [
      { name: `${emoji('info')} Prijavljivač`, value: message.author.tag, inline: true },
      { name: `${emoji('stats')} Prijavljeni korisnik`, value: reportedUser.tag, inline: true },
      { name: `${emoji('warning')} Razlog`, value: reason, inline: false },
      { name: `${emoji('tacka')} ID Prijave`, value: reportId, inline: true },
      { name: '📊 Status', value: 'PENDING', inline: true }
    ]
  });

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
        .setEmoji(emoji('reject'))
    );

  await reportChannel.send({ embeds: [reportEmbed], components: [buttons] });

  const userEmbed = embeds.custom({
    title: `${emoji('success')} Prijava Poslana`,
    description: `Prijavili ste korisnika ${reportedUser.tag}`,
    color: 0x2ECC71,
    fields: [
      { name: `${emoji('warning')} Razlog`, value: reason, inline: false },
      { name: `${emoji('tacka')} ID Prijave`, value: reportId, inline: true }
    ]
  });

  return message.reply({ embeds: [userEmbed] });
}

export default { meta, execute };
