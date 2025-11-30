import { EmbedBuilder } from 'discord.js';

export const meta_banner = {
  name: 'banner',
  description: 'Prikaži banner korisnika'
};

export async function execute_banner(message, args) {
  const target = message.mentions.users.first() || message.author;
  
  const user = await message.client.users.fetch(target.id, { force: true });
  const bannerUrl = user.bannerURL({ size: 512, dynamic: true });

  if (!bannerUrl) {
    return message.reply(`${emoji('error')} ${target.tag} nema bannera!`);
  }

  const embed = new EmbedBuilder()
    .setColor(user.accentColor || 0x2596BE)
    .setTitle(`${emoji('info')} Banner - ${target.username}`)
    .setImage(bannerUrl)
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}