import { initUser, updateUser } from '../../database/userDB.js';
import GameEmbeds from '../../utils/embeds.js';
import { emoji } from '../../utils/emojis.js';

export const meta = {
  name: 'coinflip',
  description: 'Igraj Novčić - odaberi Pismo ili Glava'
};

export async function execute(message, args) {
  const gameEmbeds = new GameEmbeds(message.client);
  const user = initUser(message.author.id);
  let bet = args[0];
  const choice = args[1]?.toLowerCase();

  // Validacija inputa
  if (!bet || !choice || !['pismo', 'glava'].includes(choice)) {
    return message.reply({
      embeds: [gameEmbeds.error(
        'Coinflip',
        `Koristi: \`-coinflip <bet|all|half> <pismo|glava>\``,
        message.author,
        emoji('dice')
      )]
    });
  }

  if (bet === 'all') bet = user.cash;
  else if (bet === 'half') bet = Math.floor(user.cash / 2);
  else bet = parseInt(bet);

  if (isNaN(bet) || bet <= 0) {
    return message.reply({
      embeds: [gameEmbeds.error('Coinflip', 'Unesite validan ulog!', message.author)]
    });
  }

  if (bet > user.cash) {
    return message.reply({
      embeds: [gameEmbeds.insufficientFunds(user.cash, bet, message.author)]
    });
  }

  // Simulacija
  const result = Math.random() > 0.5 ? 'glava' : 'pismo';
  const win = choice === result;

  user.cash -= bet;

  if (win) {
    user.cash += bet * 2;
    updateUser(message.author.id, user);

    const embed = gameEmbeds.win(`${emoji('dice')} Coinflip`, {
      description: `Odabrao si **${choice}** i pogodio si!\nRezultat je bio **${result}**`,
      winAmount: bet,
      totalAmount: user.cash,
      author: message.author,
      multiplier: '2x',
      fields: [
        {
          name: `${emoji('celebration')} Rezultat`,
          value: choice === 'glava' ? '👑 GLAVA!' : '📜 PISMO!',
          inline: true
        }
      ]
    });

    return message.reply({ embeds: [embed] });
  } else {
    updateUser(message.author.id, user);

    const embed = gameEmbeds.lose(`${emoji('dice')} Coinflip`, {
      description: `Odabrao si **${choice}** ali je rezultat bio **${result}**`,
      lostAmount: bet,
      remainingAmount: user.cash,
      author: message.author,
      reason: `Suprotno od tvog izbora`
    });

    return message.reply({ embeds: [embed] });
  }
}