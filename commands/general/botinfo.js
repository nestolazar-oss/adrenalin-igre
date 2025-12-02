import { EmbedBuilder, version } from 'discord.js';
import { emoji } from '../../utils/emojis.js';

export const meta = {
  name: 'botinfo',
  description: 'Informacije o botu'
};

export async function execute(message, args) {
  const bot = message.client.user;
  const owner = await message.client.users.fetch(process.env.OWNER_ID);

  const embed = new EmbedBuilder()
    .setColor(0x2596BE)
    .setTitle(`${emoji('tada')} Bot Informacije`)
    .setThumbnail(bot.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: `${emoji('info')} Naziv`, value: bot.username, inline: true },
      { name: `${emoji('stats')} ID`, value: bot.id, inline: true },
      { name: `${emoji('info')} Vlasnik`, value: owner.tag, inline: true },
      { name: `${emoji('info')} Discord.js`, value: `v${version}`, inline: true },
      { name: `${emoji('info')} Node.js`, value: process.version, inline: true },
      { name: `${emoji('warning')} Ping`, value: `${message.client.ws.ping}ms`, inline: true }
    )
    .setFooter({ text: 'Adrenalin Bot' })
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}