import { EmbedBuilder } from 'discord.js';
import { initUser, updateUser } from '../../database/userDB.js';
import { emoji } from '../../utils/emojis.js';

export const meta = {
  name: 'addmoney',
  aliases: ['add'],
  description: 'Dodaj novac korisniku (SAMO VLASNIK)'
};

export async function execute(message, args) {
  const OWNER_ID = process.env.OWNER_ID || '799107594404495413';
  
  if (message.author.id !== OWNER_ID) {
    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`${emoji('reject')} Pristup odbijen`)
      .setDescription('Samo vlasnik bota može koristiti ovu komandu!')
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  const target = message.mentions.users.first();
  const amount = parseInt(args[1]);

  if (!target) {
    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`${emoji('error')} Greška`)
      .setDescription(`Označi korisnika! Koristi: \`-addmoney @user <amount>\``)
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  if (isNaN(amount) || amount <= 0) {
    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`${emoji('error')} Greška`)
      .setDescription('Unesite validan iznos!')
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  const user = initUser(target.id);
  user.cash += amount;
  updateUser(target.id, user);

  const embed = new EmbedBuilder()
    .setColor(0x2ECC71)
    .setTitle(`${emoji('coins')} Dodano Novca`)
    .setDescription(`${target.tag} je dobio **$${amount}**`)
    .addFields(
      { name: `${emoji('cash')} Nova gotovina`, value: `$${user.cash.toLocaleString()}`, inline: false }
    )
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}