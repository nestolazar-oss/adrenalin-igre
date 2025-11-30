import { EmbedBuilder } from 'discord.js';
import embeds from '../../utils/embeds.js';

export const meta = {
  name: 'cleartimeout',
  aliases: ['unmute'],
  description: 'Ukloni timeout sa korisnika'
};

export async function execute(message, args) {
  if (!message.member.permissions.has('ModerateMembers')) {
    return message.reply(embeds.error('Greška', `${emoji('reject')} Nemaš dozvolu!`));
  }

  const target = message.mentions.users.first();

  if (!target) {
    return message.reply(embeds.error('Greška', `${emoji('error')} Označi korisnika!`));
  }

  const member = await message.guild.members.fetch(target.id).catch(() => null);
  if (!member) {
    return message.reply(embeds.error('Greška', `${emoji('error')} Korisnik nije na serveru!`));
  }

  try {
    await member.timeout(null);

    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle(`${emoji('success')} Timeout Uklonjen`)
      .addFields({ name: `${emoji('info')} Korisnik`, value: `${target.tag}`, inline: true })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Clear timeout error:', error);
    return message.reply(embeds.error('Greška', `${emoji('error')} Nisam mogao ukloniti timeout!`));
  }
}