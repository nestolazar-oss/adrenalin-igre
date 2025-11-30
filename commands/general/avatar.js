import { EmbedBuilder } from 'discord.js';

export const meta = {
  name: 'avatar',
  aliases: ['av'],
  description: 'Prikaži avatar korisnika'
};

export async function execute(message, args) {
  const target = message.mentions.users.first() || message.author;
  
  const embed = new EmbedBuilder()
    .setColor(0x2596BE)
    .setTitle(`${emoji('info')} Avatar - ${target.username}`)
    .setImage(target.displayAvatarURL({ size: 512, dynamic: true }))
    .addFields(
      { name: 'Tag', value: target.tag, inline: true },
      { name: 'ID', value: target.id, inline: true },
      { name: 'Kreirano', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`, inline: true }
    )
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}