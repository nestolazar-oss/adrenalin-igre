import { EmbedBuilder } from 'discord.js';

export const meta_avatarbanner = {
  name: 'avatarbanner',
  aliases: ['avbanner'],
  description: 'Avatar + Banner u jednoj komandi'
};

export async function execute_avatarbanner(message, args) {
  const target = message.mentions.users.first() || message.author;
  const user = await message.client.users.fetch(target.id, { force: true });
  const bannerUrl = user.bannerURL({ size: 512, dynamic: true });

  const embed = new EmbedBuilder()
    .setColor(user.accentColor || 0x2596BE)
    .setTitle(`${emoji('info')} Avatar & Banner - ${target.username}`)
    .setThumbnail(target.displayAvatarURL({ size: 256, dynamic: true }))
    .addFields(
      { name: 'Tag', value: target.tag, inline: true },
      { name: 'ID', value: target.id, inline: true }
    );

  if (bannerUrl) {
    embed.setImage(bannerUrl);
  }

  embed.setTimestamp();
  return message.reply({ embeds: [embed] });
}
