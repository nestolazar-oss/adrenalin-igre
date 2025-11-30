import { EmbedBuilder } from 'discord.js';
import { initUser, getUser, getAllUsers } from '../../utils/db.js';
import embeds from '../../utils/embeds.js';

export const meta = {
  name: 'balance',
  aliases: ['bal'],
  description: 'Prikaži tvoj novac i banka račun'
};

export async function execute(message, args) {
  const user = message.mentions.users.first() || message.author;
  const userData = initUser(user.id);
  
  const allUsers = getAllUsers();
  const sorted = Object.entries(allUsers)
    .sort((a, b) => (b[1].cash + b[1].bank) - (a[1].cash + a[1].bank));
  
  const rank = sorted.findIndex(([id]) => id === user.id) + 1;
  
  const embed = new EmbedBuilder()
    .setColor(0x2596BE)
    .setTitle(`${emoji('coins')} ${user.username} - Bankovni račun`)
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: `${emoji('cash')} Gotovina`, value: `$${userData.cash.toLocaleString()}`, inline: true },
      { name: `${emoji('bank')} Banka`, value: `$${userData.bank.toLocaleString()}`, inline: true },
      { name: `${emoji('wallet')} Ukupno`, value: `$${(userData.cash + userData.bank).toLocaleString()}`, inline: true },
      { name: `${emoji('trophy')} Rang`, value: `#${rank} od ${Object.keys(allUsers).length}`, inline: true }
    )
    .setFooter({ text: 'Adrenalin Banka' })
    .setTimestamp();
  
  return message.reply({ embeds: [embed] });
}