import { EmbedBuilder } from 'discord.js';
import { initUser, updateUser } from '../../database/userDB.js';
import { emoji } from '../../utils/emojis.js';

export const meta = {
  name: 'withdraw',
  aliases: ['with'],
  description: 'Povuci novac iz banke'
};

export async function execute(message, args) {
  const user = initUser(message.author.id);
  let amount = args[0];

  if (!amount) {
    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`${emoji('error')} Greška`)
      .setDescription(`Koristi: \`-with <amount|all|half>\``)
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  if (amount === 'all') {
    amount = user.bank;
  } else if (amount === 'half') {
    amount = Math.floor(user.bank / 2);
  } else {
    amount = parseInt(amount);
  }

  if (isNaN(amount) || amount <= 0) {
    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`${emoji('error')} Greška`)
      .setDescription('Unesite validan iznos!')
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  if (amount > user.bank) {
    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`${emoji('error')} Greška`)
      .setDescription(`Nemate toliko u banci! Imate: $${user.bank.toLocaleString()}`)
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  user.bank -= amount;
  user.cash += amount;
  updateUser(message.author.id, user);

  const embed = new EmbedBuilder()
    .setColor(0x2ECC71)
    .setTitle(`${emoji('cash')} Povlačenje Uspješno`)
    .setDescription(`Povukli ste **$${amount.toLocaleString()}** iz banke`)
    .addFields(
      { name: `${emoji('cash')} Nova gotovina`, value: `$${user.cash.toLocaleString()}`, inline: true },
      { name: `${emoji('bank')} Nova banka`, value: `$${user.bank.toLocaleString()}`, inline: true }
    )
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}