import { EmbedBuilder } from 'discord.js';
import { initUser, updateUser } from '../../utils/db.js';

export const meta = {
  name: 'addmoney',
  aliases: ['add'],
  description: 'Dodaj novac korisniku (SAMO VLASNIK)'
};

export async function execute(message, args) {
  const OWNER_ID = process.env.OWNER_ID || '799107594404495413';
  
  if (message.author.id !== OWNER_ID) {
    return message.reply('❌ Samo vlasnik bota može koristiti ovu komandu!');
  }

  const target = message.mentions.users.first();
  const amount = parseInt(args[1]);

  if (!target) {
    return message.reply('❌ Označi korisnika! Koristi: `-addmoney @user <amount>`');
  }

  if (isNaN(amount) || amount <= 0) {
    return message.reply('❌ Unesite validan iznos!');
  }

  const user = initUser(target.id);
  user.cash += amount;
  updateUser(target.id, user);

  const embed = new EmbedBuilder()
    .setColor(0x2ECC71)
    .setTitle('💰 Dodano Novca')
    .setDescription(`${target.tag} je dobio **$${amount}**`)
    .addFields(
      { name: '💵 Nova gotovina', value: `$${user.cash.toLocaleString()}`, inline: false }
    )
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}