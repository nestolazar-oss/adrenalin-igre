import { EmbedBuilder } from 'discord.js';
import embeds from '../../utils/embeds.js';

export const meta = {
  name: 'timeout',
  aliases: ['mute'],
  description: 'Postavi timeout korisniku (mute)'
};

export async function execute(message, args) {
  if (!message.member.permissions.has('ModerateMembers')) {
    return message.reply(embeds.error('Greška', `${emoji('reject')} Nemaš dozvolu za timeout!`));
  }

  const target = message.mentions.users.first();
  const durationStr = args[1] || '10m';
  const reason = args.slice(2).join(' ') || 'Bez razloga';

  if (!target) {
    return message.reply(embeds.error('Greška', `${emoji('error')} Označi korisnika! \`-timeout @user <10m|1h|1d|...> [reason]\``));
  }

  const member = await message.guild.members.fetch(target.id).catch(() => null);
  if (!member) {
    return message.reply(embeds.error('Greška', `${emoji('error')} Korisnik nije na serveru!`));
  }

  let duration = 0;
  const match = durationStr.match(/(\d+)([smhd])/);

  if (!match) {
    return message.reply(embeds.error('Greška', `${emoji('error')} Format: \`10s|30m|1h|1d\``));
  }

  const amount = parseInt(match[1]);
  const unit = match[2];

  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  duration = amount * (multipliers[unit] || 1000);

  if (duration > 28 * 24 * 60 * 60 * 1000) {
    return message.reply(embeds.error('Greška', `${emoji('warning')} Maksimalno trajanje je 28 dana!`));
  }

  try {
    await member.timeout(duration, reason);

    const embed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle(`${emoji('warning')} Timeout Postavljen`)
      .addFields(
        { name: `${emoji('info')} Korisnik`, value: `${target.tag}`, inline: true },
        { name: `${emoji('clock')} Trajanje`, value: durationStr, inline: true },
        { name: `${emoji('stats')} Moderator`, value: `${message.author.tag}`, inline: true },
        { name: `${emoji('warning')} Razlog`, value: reason, inline: false }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Timeout error:', error);
    return message.reply(embeds.error('Greška', `${emoji('error')} Nisam mogao postaviti timeout!`));
  }
}