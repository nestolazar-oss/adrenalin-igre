import { EmbedBuilder } from 'discord.js';
import { emoji } from '../../utils/emojis.js';

export const meta = {
  name: 'serverinfo',
  aliases: ['si'],
  description: 'Informacije o serveru'
};

export async function execute(message, args) {
  const guild = message.guild;
  const owner = await guild.fetchOwner();

  const embed = new EmbedBuilder()
    .setColor(0x2596BE)
    .setTitle(`${emoji('info')} Server Informacije`)
    .setThumbnail(guild.iconURL({ size: 256, dynamic: true }))
    .addFields(
      { name: `${emoji('info')} Naziv`, value: guild.name, inline: true },
      { name: `${emoji('stats')} ID`, value: guild.id, inline: true },
      { name: `${emoji('info')} Vlasnik`, value: owner.user.tag, inline: true },
      { name: `${emoji('stats')} Članovi`, value: guild.memberCount.toString(), inline: true },
      { name: `${emoji('tacka')} Kanali`, value: guild.channels.cache.size.toString(), inline: true },
      { name: `${emoji('stats')} Uloge`, value: guild.roles.cache.size.toString(), inline: true },
      { name: `${emoji('stats')} Emodži`, value: guild.emojis.cache.size.toString(), inline: true },
      { name: `${emoji('clock')} Kreiran`, value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true }
    )
    .setFooter({ text: 'Server Info' })
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}