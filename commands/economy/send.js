import { EmbedBuilder } from 'discord.js';
import { initUser, updateUser } from '../../database/userDB.js';
import { emoji } from '../../utils/emojis.js';

export const meta = {
  name: 'send',
  description: 'Pošalji novac drugom korisniku'
};

export async function execute(message, args) {
  const recipient = message.mentions.users.first();
  const amount = parseInt(args[1]);

  if (!recipient) {
    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`${emoji('error')} Greška`)
      .setDescription('Označi korisnika!')
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  if (recipient.id === message.author.id) {
    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`${emoji('error')} Greška`)
      .setDescription('Ne možeš poslati novac sam sebi!')
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

  const sender = initUser(message.author.id);
  const receiver = initUser(recipient.id);

  if (amount > sender.cash) {
    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`${emoji('error')} Greška`)
      .setDescription(`Nemate toliko gotovine! Imate: $${sender.cash.toLocaleString()}`)
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  sender.cash -= amount;
  receiver.cash += amount;

  updateUser(message.author.id, sender);
  updateUser(recipient.id, receiver);

  const embed = new EmbedBuilder()
    .setColor(0x2ECC71)
    .setTitle(`${emoji('money_bag')} Transakcija Uspješna`)
    .addFields(
      { name: `${emoji('up')} Pošiljaoc`, value: `${message.author.tag}\nNova gotovina: $${sender.cash.toLocaleString()}`, inline: true },
      { name: `${emoji('down')} Primač`, value: `${recipient.tag}\nNova gotovina: $${receiver.cash.toLocaleString()}`, inline: true },
      { name: `${emoji('coins')} Iznos`, value: `$${amount.toLocaleString()}`, inline: false }
    )
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}