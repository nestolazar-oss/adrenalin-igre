import { EmbedBuilder } from 'discord.js';
import { initUser, updateUser } from '../../utils/db.js';
import embeds from '../../utils/embeds.js';

export const meta = {
  name: 'send',
  description: 'Pošalji novac drugom korisniku'
};

export async function execute(message, args) {
  const recipient = message.mentions.users.first();
  const amount = parseInt(args[1]);

  if (!recipient) {
    return message.reply(embeds.error('Greška', 'Označi korisnika!'));
  }

  if (recipient.id === message.author.id) {
    return message.reply(embeds.error('Greška', 'Ne možeš poslati novac sam sebi!'));
  }

  if (isNaN(amount) || amount <= 0) {
    return message.reply(embeds.error('Greška', 'Unesite validan iznos!'));
  }

  const sender = initUser(message.author.id);
  const receiver = initUser(recipient.id);

  if (amount > sender.cash) {
    return message.reply(embeds.error('Greška', `Nemate toliko gotovine! Imate: $${sender.cash.toLocaleString()}`));
  }

  sender.cash -= amount;
  receiver.cash += amount;

  updateUser(message.author.id, sender);
  updateUser(recipient.id, receiver);

  const embed = new EmbedBuilder()
    .setColor(0x2ECC71)
    .setTitle(`${emoji('coins')} Transakcija Uspješna`)
    .addFields(
      { name: `${emoji('up')} Pošiljaoc`, value: `${message.author.tag}\nNova gotovina: $${sender.cash.toLocaleString()}`, inline: true },
      { name: `${emoji('down')} Primač`, value: `${recipient.tag}\nNova gotovina: $${receiver.cash.toLocaleString()}`, inline: true },
      { name: `${emoji('cash')} Iznos`, value: `$${amount.toLocaleString()}`, inline: false }
    )
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}