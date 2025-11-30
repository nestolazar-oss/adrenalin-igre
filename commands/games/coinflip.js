import { EmbedBuilder } from 'discord.js';
import { initUser, updateUser } from '../../utils/db.js';

export const meta = {
  name: 'coinflip',
  description: 'Igraj Novčić - odaberi Pismo ili Glava'
};

const gameSessions = new Map();

export async function execute(message, args) {
  const user = initUser(message.author.id);
  let bet = args[0];
  const choice = args[1]?.toLowerCase();

  if (!bet || !choice || !['pismo', 'glava'].includes(choice)) {
    return message.reply(`${emoji('error')} Koristi: \`-coinflip <bet|all|half> <pismo|glava>\``);
  }

  if (bet === 'all') bet = user.cash;
  else if (bet === 'half') bet = Math.floor(user.cash / 2);
  else bet = parseInt(bet);

  if (isNaN(bet) || bet <= 0) return message.reply(`${emoji('error')} Unesite validan ulog!`);
  if (bet > user.cash) return message.reply(`${emoji('error')} Nemate toliko novca!`);

  const result = Math.random() > 0.5 ? 'glava' : 'pismo';
  const win = choice === result;

  user.cash -= bet;

  if (win) {
    user.cash += bet * 2;
    updateUser(message.author.id, user);

    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle(`${emoji('celebration')} Pobijedio Si!`)
      .setDescription(`Odabrao si **${choice}** i pogodio si!\nRezultat je bio **${result}**`)
      .addFields(
        { name: `${emoji('coins')} Dobit`, value: `$${bet}`, inline: true },
        { name: `${emoji('cash')} Nova gotovina`, value: `$${user.cash.toLocaleString()}`, inline: true }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  } else {
    updateUser(message.author.id, user);

    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`${emoji('error')} Izgubio Si!`)
      .setDescription(`Odabrao si **${choice}** ali je rezultat bio **${result}**`)
      .addFields(
        { name: `${emoji('bomb')} Gubitak`, value: `-$${bet}`, inline: true },
        { name: `${emoji('cash')} Nova gotovina`, value: `$${user.cash.toLocaleString()}`, inline: true }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
}