import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { initUser, updateUser } from '../../database/userDB.js';

export const meta = {
  name: 'blackjack',
  aliases: ['bj'],
  description: 'Igraj Blackjack - 21!'
};

const CARD_VALUES = {
  'A': [1, 11],
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 10, 'Q': 10, 'K': 10
};

const SUITS = ['♠', '♥', '♦', '♣'];
const CARDS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function generateCard() {
  return `${CARDS[Math.floor(Math.random() * CARDS.length)]}${SUITS[Math.floor(Math.random() * SUITS.length)]}`;
}

function getCardValue(card) {
  const rank = card.slice(0, -1);
  return CARD_VALUES[rank];
}

function calculateHand(cards) {
  let total = 0;
  let aces = 0;

  for (const card of cards) {
    const value = getCardValue(card);
    if (Array.isArray(value)) {
      aces++;
      total += 11;
    } else {
      total += value;
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
}

export async function execute(message, args) {
  const user = initUser(message.author.id);
  let bet = args[0];

  if (!bet) {
    return message.reply(`${emoji('error')} Koristi: \`-bj <bet|all|half>\``);
  }

  if (bet === 'all') bet = user.cash;
  else if (bet === 'half') bet = Math.floor(user.cash / 2);
  else bet = parseInt(bet);

  if (isNaN(bet) || bet <= 0) return message.reply(`${emoji('error')} Unesite validan ulog!`);
  if (bet > user.cash) return message.reply(`${emoji('error')} Nemate toliko novca!`);

  user.cash -= bet;
  updateUser(message.author.id, user);

  const playerCards = [generateCard()];
  const dealerCards = [generateCard(), generateCard()];
  
  let gameOver = false;
  let playerStand = false;
  let doubleDown = false;

  const createBoard = () => {
    const rows = [];
    const row1 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('bj_hit')
          .setLabel('HIT')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(gameOver || playerStand),
        new ButtonBuilder()
          .setCustomId('bj_stand')
          .setLabel('STAND')
          .setStyle(ButtonStyle.Success)
          .setDisabled(gameOver)
      );
    
    const row2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('bj_double')
          .setLabel('DOUBLE DOWN')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(gameOver || playerStand || doubleDown || playerCards.length !== 1),
        new ButtonBuilder()
          .setCustomId('bj_exit')
          .setLabel('EXIT')
          .setStyle(ButtonStyle.Danger)
      );

    rows.push(row1, row2);
    return rows;
  };

  const updateEmbed = () => {
    const playerValue = calculateHand(playerCards);
    const dealerValue = playerStand ? calculateHand(dealerCards) : getCardValue(dealerCards[0]);

    return new EmbedBuilder()
      .setColor(0x2596BE)
      .setTitle(`${emoji('cards')} Blackjack - Ulog: $${bet}`)
      .addFields(
        { name: `👤 Tvoja ruka`, value: `${playerCards.join(' ')} = **${playerValue}**`, inline: true },
        { name: `${emoji('trophy')} Dealer ruka`, value: playerStand ? `${dealerCards.join(' ')} = **${dealerValue}**` : `${dealerCards[0]} 🂠`, inline: true }
      )
      .setFooter({ text: gameOver ? 'Igra je gotova' : 'Tvoj red je...' });
  };

  let msg = await message.reply({
    embeds: [updateEmbed()],
    components: createBoard()
  });

  const collector = msg.createMessageComponentCollector({ time: 300000 });

  collector.on('collect', async (interaction) => {
    if (interaction.user.id !== message.author.id) {
      return interaction.reply({ content: `${emoji('error')} Ovo nije tvoja igra!`, ephemeral: true });
    }

    if (interaction.customId === 'bj_hit') {
      playerCards.push(generateCard());
      const playerValue = calculateHand(playerCards);

      if (playerValue > 21) {
        gameOver = true;
        const bustEmbed = new EmbedBuilder()
          .setColor(0xE74C3C)
          .setTitle(`${emoji('bomb')} Bust! Izgubio Si!`)
          .setDescription(`Prekoračio si 21 (${playerValue})`)
          .addFields(
            { name: `${emoji('coins')} Nova gotovina`, value: `$${user.cash.toLocaleString()}`, inline: false }
          );

        collector.stop();
        return interaction.update({
          embeds: [bustEmbed],
          components: createBoard()
        });
      }

      await interaction.update({
        embeds: [updateEmbed()],
        components: createBoard()
      });
    }

    if (interaction.customId === 'bj_stand') {
      playerStand = true;

      let dealerValue = calculateHand(dealerCards);
      while (dealerValue < 17) {
        dealerCards.push(generateCard());
        dealerValue = calculateHand(dealerCards);
      }

      const playerValue = calculateHand(playerCards);
      gameOver = true;

      let result = '';
      let color = 0x2596BE;
      let winAmount = 0;

      if (dealerValue > 21) {
        result = `${emoji('celebration')} Dealer je dao bust! Pobedio si!`;
        color = 0x2ECC71;
        winAmount = bet * 2;
      } else if (playerValue > dealerValue) {
        result = `${emoji('celebration')} Pobedio si!`;
        color = 0x2ECC71;
        winAmount = bet * 2;
      } else if (playerValue === dealerValue) {
        result = `${emoji('thinking')} Push! Vraćen ti je ulog!`;
        color = 0xF1C40F;
        winAmount = bet;
      } else {
        result = `${emoji('error')} Dealer je pobedio!`;
        color = 0xE74C3C;
        winAmount = 0;
      }

      user.cash += winAmount;
      updateUser(message.author.id, user);

      const resultEmbed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${emoji('cards')} Blackjack - Rezultat`)
        .setDescription(result)
        .addFields(
          { name: '👤 Tvoja ruka', value: `${playerCards.join(' ')} = **${playerValue}**`, inline: true },
          { name: `${emoji('trophy')} Dealer ruka`, value: `${dealerCards.join(' ')} = **${dealerValue}**`, inline: true },
          { name: `${emoji('coins')} Nagrada`, value: `$${winAmount - bet}`, inline: false },
          { name: `${emoji('cash')} Nova gotovina`, value: `$${user.cash.toLocaleString()}`, inline: false }
        );

      collector.stop();
      return interaction.update({
        embeds: [resultEmbed],
        components: createBoard()
      });
    }

    if (interaction.customId === 'bj_double') {
      const extraBet = bet;
      
      if (user.cash < extraBet) {
        return interaction.reply({ content: `${emoji('error')} Nemaš dovoljno novca za Double Down!`, ephemeral: true });
      }

      user.cash -= extraBet;
      updateUser(message.author.id, user);
      
      doubleDown = true;
      bet = bet * 2;
      playerCards.push(generateCard());
      playerStand = true;

      let dealerValue = calculateHand(dealerCards);
      while (dealerValue < 17) {
        dealerCards.push(generateCard());
        dealerValue = calculateHand(dealerCards);
      }

      const playerValue = calculateHand(playerCards);
      gameOver = true;

      let result = '';
      let color = 0x2596BE;
      let winAmount = 0;

      if (playerValue > 21) {
        result = `${emoji('bomb')} Bust! Izgubio si!`;
        color = 0xE74C3C;
      } else if (dealerValue > 21) {
        result = `${emoji('celebration')} Dealer je dao bust! Pobedio si!`;
        color = 0x2ECC71;
        winAmount = bet * 2;
      } else if (playerValue > dealerValue) {
        result = `${emoji('celebration')} Pobedio si sa Double Down!`;
        color = 0x2ECC71;
        winAmount = bet * 2;
      } else if (playerValue === dealerValue) {
        result = `${emoji('thinking')} Push!`;
        color = 0xF1C40F;
        winAmount = bet;
      } else {
        result = `${emoji('error')} Dealer je pobedio!`;
        color = 0xE74C3C;
      }

      user.cash += winAmount;
      updateUser(message.author.id, user);

      const ddEmbed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${emoji('cards')} Blackjack - Double Down!`)
        .setDescription(result)
        .addFields(
          { name: '👤 Tvoja ruka', value: `${playerCards.join(' ')} = **${playerValue}**`, inline: true },
          { name: `${emoji('trophy')} Dealer ruka`, value: `${dealerCards.join(' ')} = **${dealerValue}**`, inline: true },
          { name: `${emoji('coins')} Nagrada`, value: `$${winAmount - bet}`, inline: false }
        );

      collector.stop();
      return interaction.update({
        embeds: [ddEmbed],
        components: createBoard()
      });
    }

    if (interaction.customId === 'bj_exit') {
      gameOver = true;
      const exitEmbed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle(`${emoji('error')} Napustio Si Igru`)
        .setDescription(`Izgubio si $${bet}`);

      collector.stop();
      return interaction.update({
        embeds: [exitEmbed],
        components: createBoard()
      });
    }
  });
}