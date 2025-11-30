import { EmbedBuilder } from 'discord.js';
import { initUser, updateUser } from '../../utils/db.js';
import embeds from '../../utils/embeds.js';

export const meta = {
  name: 'deposit',
  aliases: ['dep'],
  description: 'Depozituj novac u banku'
};

export async function execute(message, args) {
  const user = initUser(message.author.id);
  let amount = args[0];

  if (!amount) {
    return message.reply(embeds.error('Greška', `Koristi: \`-dep <amount|all|half>\``));
  }

  if (amount === 'all') {
    amount = user.cash;
  } else if (amount === 'half') {
    amount = Math.floor(user.cash / 2);
  } else {
    amount = parseInt(amount);
  }

  if (isNaN(amount) || amount <= 0) {
    return message.reply(embeds.error('Greška', 'Unesite validan iznos!'));
  }

  if (amount > user.cash) {
    return message.reply(embeds.error('Greška', `Nemate toliko gotovine! Imate: $${user.cash.toLocaleString()}`));
  }

  user.cash -= amount;
  user.bank += amount;
  updateUser(message.author.id, user);

  const embed = new EmbedBuilder()
    .setColor(0x2ECC71)
    .setTitle(`${emoji('bank')} Depozit Uspješan`)
    .setDescription(`Uložili ste **$${amount.toLocaleString()}** u banku`)
    .addFields(
      { name: `${emoji('cash')} Nova gotovina`, value: `$${user.cash.toLocaleString()}`, inline: true },
      { name: `${emoji('bank')} Nova banka`, value: `$${user.bank.toLocaleString()}`, inline: true }
    )
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}