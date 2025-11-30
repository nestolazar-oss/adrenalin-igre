import { EmbedBuilder } from 'discord.js';
import embeds from '../../utils/embeds.js';

export const meta = {
  name: 'unban',
  description: 'Ukloni ban sa korisnika'
};

export async function execute(message, args) {
  if (!message.member.permissions.has('BanMembers')) {
    return message.reply(embeds.error('Greška', `${emoji('reject')} Nemaš dozvolu za unban!`));
  }

  const userId = args[0];

  if (!userId) {
    return message.reply(embeds.error('Greška', `${emoji('error')} Koristi: \`-unban <user_id>\``));
  }

  try {
    await message.guild.bans.remove(userId, 'Unban');

    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle(`${emoji('success')} Unban Izvršen`)
      .addFields(
        { name: `${emoji('info')} Korisnik ID`, value: userId, inline: true },
        { name: `${emoji('stats')} Moderator`, value: `${message.author.tag}`, inline: true }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Unban error:', error);
    return message.reply(embeds.error('Greška', `${emoji('error')} Korisnik nije banovan!`));
  }
}