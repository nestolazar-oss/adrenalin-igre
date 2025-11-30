import { EmbedBuilder } from 'discord.js';
import embeds from '../../utils/embeds.js';

export const meta = {
  name: 'ban',
  description: 'Banuj korisnika sa servera'
};

export async function execute(message, args) {
  if (!message.member.permissions.has('BanMembers')) {
    return message.reply(embeds.error('Greška', `${emoji('reject')} Nemaš dozvolu za ban!`));
  }

  const target = message.mentions.users.first();
  const reason = args.slice(1).join(' ') || 'Bez razloga';

  if (!target) {
    return message.reply(embeds.error('Greška', `${emoji('error')} Označi korisnika za ban! \`-ban @user [razlog]\``));
  }

  if (target.bot) {
    return message.reply(embeds.error('Greška', `${emoji('reject')} Ne možeš baniti botove!`));
  }

  const member = await message.guild.members.fetch(target.id).catch(() => null);
  if (member && !message.member.roles.highest.comparePositionTo(member.roles.highest) > 0) {
    return message.reply(embeds.error('Greška', `${emoji('warning')} Ne možeš baniti korisnika sa većim ulogama!`));
  }

  try {
    await message.guild.bans.create(target.id, { reason });

    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`${emoji('reject')} Ban Izvršen`)
      .addFields(
        { name: `${emoji('info')} Korisnik`, value: `${target.tag}`, inline: true },
        { name: `${emoji('stats')} Moderator`, value: `${message.author.tag}`, inline: true },
        { name: `${emoji('warning')} Razlog`, value: reason, inline: false }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Ban error:', error);
    return message.reply(embeds.error('Greška', `${emoji('error')} Nisam mogao baniti korisnika!`));
  }
}