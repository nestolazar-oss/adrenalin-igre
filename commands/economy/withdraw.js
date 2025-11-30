import { EmbedBuilder } from 'discord.js';
import { initUser, updateUser } from '../../utils/db.js';
import embeds from '../../utils/embeds.js';

export const meta = {
  name: 'withdraw',
  aliases: ['with'],
  description: 'Povuci novac iz banke'
};

export async function execute(message, args) {
  const user = initUser(message.author.id);
  let amount = args[0];

  if (!amount) {
    return message.reply(embeds.error('Greška', `Koristi: \`-with <amount|all|half>\``));
  }

  if (amount === 'all') {
    amount = user.bank;
  } else if (amount === 'half') {
    amount = Math.floor(user.bank / 2);
  } else {
    amount = parseInt(amount);
  }

  if (isNaN(amount) || amount <= 0) {
    return message.reply(embeds.error('Greška', 'Unesite validan iznos!'));
  }

  if (amount > user.bank) {
    return message.reply(embeds.error('Greška', `Nemate toliko u banci! Imate: $${user.bank.toLocaleString()}`));
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