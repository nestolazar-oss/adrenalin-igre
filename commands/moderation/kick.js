import { EmbedBuilder } from 'discord.js';
import embeds from '../../utils/embeds.js';

export const meta = {
  name: 'kick',
  description: 'Izbaci korisnika sa servera'
};

export async function execute(message, args) {
  if (!message.member.permissions.has('KickMembers')) {
    return message.reply(embeds.error('Greška', `${emoji('reject')} Nemaš dozvolu za kick!`));
  }

  const target = message.mentions.users.first();
  const reason = args.slice(1).join(' ') || 'Bez razloga';

  if (!target) {
    return message.reply(embeds.error('Greška', `${emoji('error')} Označi korisnika za kick!`));
  }

  if (target.bot) {
    return message.reply(embeds.error('Greška', `${emoji('reject')} Ne možeš izbaciti botove!`));
  }

  const member = await message.guild.members.fetch(target.id).catch(() => null);
  if (!member) {
    return message.reply(embeds.error('Greška', `${emoji('error')} Korisnik nije na serveru!`));
  }

  if (!message.member.roles.highest.comparePositionTo(member.roles.highest) > 0) {
    return message.reply(embeds.error('Greška', `${emoji('warning')} Ne možeš izbaciti korisnika sa većim ulogama!`));
  }

  try {
    await member.kick(reason);

    const embed = new EmbedBuilder()
      .setColor(0xE67E22)
      .setTitle(`${emoji('tada')} Kick Izvršen`)
      .addFields(
        { name: `${emoji('info')} Korisnik`, value: `${target.tag}`, inline: true },
        { name: `${emoji('stats')} Moderator`, value: `${message.author.tag}`, inline: true },
        { name: `${emoji('warning')} Razlog`, value: reason, inline: false }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Kick error:', error);
    return message.reply(embeds.error('Greška', `${emoji('error')} Nisam mogao izbaciti korisnika!`));
  }
}