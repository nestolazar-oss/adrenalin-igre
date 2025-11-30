import { EmbedBuilder } from 'discord.js';
import { initUser, updateUser } from '../../utils/db.js';

export const meta = {
  name: 'roulette',
  aliases: ['rulet'],
  description: 'Igraj Rulet - Red, Black, 1-18, 19-36, itd.'
};

const ROULETTE_COLORS = {
  1: '🔴', 2: '⚫', 3: '🔴', 4: '⚫', 5: '🔴', 6: '⚫', 7: '🔴', 8: '⚫', 9: '🔴', 10: '⚫',
  11: '⚫', 12: '🔴', 13: '⚫', 14: '🔴', 15: '⚫', 16: '🔴', 17: '⚫', 18: '🔴',
  19: '🔴', 20: '⚫', 21: '🔴', 22: '⚫', 23: '🔴', 24: '⚫', 25: '🔴', 26: '⚫', 27: '🔴', 28: '⚫',
  29: '⚫', 30: '🔴', 31: '⚫', 32: '🔴', 33: '⚫', 34: '🔴', 35: '⚫', 36: '🔴',
  0: '🟢'
};

const activeRounds = new Map();

export async function execute(message, args) {
  const option = args[0]?.toLowerCase();
  let bet = args[1];

  const validOptions = ['red', 'black', '1-18', '19-36', 'even', 'odd', '1-12', '13-24', '25-36', '1st', '2nd', '3rd'];

  if (!option || !validOptions.includes(option)) {
    return message.reply(`❌ Koristi: \`-roulette <${validOptions.join('|')}> <bet|all|half>\``);
  }

  if (!bet) {
    return message.reply('❌ Unesite ulog!');
  }

  const user = initUser(message.author.id);

  if (bet === 'all') bet = user.cash;
  else if (bet === 'half') bet = Math.floor(user.cash / 2);
  else bet = parseInt(bet);

  if (isNaN(bet) || bet <= 0) return message.reply('❌ Unesite validan ulog!');
  if (bet > user.cash) return message.reply('❌ Nemate toliko novca!');

  const channelId = message.channelId;
  let roundData = activeRounds.get(channelId);

  // Ako nema aktivne runde, kreiraj novu
  if (!roundData) {
    roundData = {
      bets: {},
      timeLeft: 30,
      result: null,
      isRolled: false,
      startTime: Date.now(),
      updateMessage: null
    };
    activeRounds.set(channelId, roundData);

    startRoundTimer(message.channel, channelId, roundData);
  }

  // Dodaj korisnikov ulog
  if (!roundData.bets[message.author.id]) {
    roundData.bets[message.author.id] = [];
  }

  user.cash -= bet;
  updateUser(message.author.id, user);

  roundData.bets[message.author.id].push({ option, bet, user: message.author.tag });

  const betCount = Object.keys(roundData.bets).length;
  const embed = new EmbedBuilder()
    .setColor(0x2596BE)
    .setTitle('🎡 Rulet - Runda u Toku')
    .setDescription(`${message.author.tag} je stavio **$${bet}** na **${option.toUpperCase()}**`)
    .addFields(
      { name: '⏱️ Vreme do izvlačenja', value: `${roundData.timeLeft}s`, inline: true },
      { name: '👥 Igrači', value: `${betCount}`, inline: true }
    )
    .setFooter({ text: 'Vrati se do 30 sekundi da postaviš novu uloga!' });

  return message.reply({ embeds: [embed] });
}

function startRoundTimer(channel, channelId, roundData) {
  let msg = null;

  const updateTimer = async () => {
    const betCount = Object.keys(roundData.bets).length;
    
    const embed = new EmbedBuilder()
      .setColor(0x2596BE)
      .setTitle('🎡 Rulet - Runda u Toku')
      .setDescription(`Runda je počela! Ulozi su primljeni.`)
      .addFields(
        { name: '⏱️ Vreme do izvlačenja', value: `**${roundData.timeLeft}s**`, inline: true },
        { name: '👥 Igrači', value: `${betCount}`, inline: true }
      )
      .setFooter({ text: `Ukupno igrača: ${betCount}` });

    if (!msg) {
      msg = await channel.send({ embeds: [embed] });
    } else {
      try {
        await msg.edit({ embeds: [embed] });
      } catch (e) {
        // Ignorisi greške ako poruka ne postoji
      }
    }
  };

  updateTimer();

  const interval = setInterval(async () => {
    roundData.timeLeft--;
    
    if (roundData.timeLeft > 0) {
      await updateTimer();
    }

    if (roundData.timeLeft <= 0) {
      clearInterval(interval);
      roundData.isRolled = true;
      await rollRoulette(channel, roundData, channelId);
      activeRounds.delete(channelId);
    }
  }, 1000);
}

async function rollRoulette(channel, roundData, channelId) {
  const result = Math.floor(Math.random() * 37);
  const color = ROULETTE_COLORS[result] || '🟢';

  let winners = [];
  let winnings = {};

  for (const [userId, bets] of Object.entries(roundData.bets)) {
    for (const bet of bets) {
      const won = checkWin(bet.option, result);

      if (won) {
        if (!winners.includes(userId)) {
          winners.push(userId);
        }

        const multiplier = getMultiplier(bet.option);
        const reward = Math.floor(bet.bet * multiplier);

        if (!winnings[userId]) {
          winnings[userId] = { total: 0, bets: [] };
        }

        winnings[userId].total += reward;
        winnings[userId].bets.push(`${bet.option} (+$${reward})`);

        const user = initUser(userId);
        user.cash += reward;
        updateUser(userId, user);
      }
    }
  }

  let description = `\n**${color} Rezultat: ${result}**\n`;

  if (winners.length > 0) {
    description += `\n**🏆 Pobjednici:**\n`;
    for (const userId of winners) {
      const data = winnings[userId];
      description += `<@${userId}> - **+$${data.total}**\n`;
    }
  } else {
    description += `\n**😢 Nema pobednika ovog puta!**`;
  }

  const embed = new EmbedBuilder()
    .setColor(result === 0 ? 0x27AE60 : (result % 2 === 0 ? 0x2C3E50 : 0xC0392B))
    .setTitle('🎡 Rulet - Izvlačenje!')
    .setDescription(description)
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

function checkWin(option, result) {
  if (option === 'red') return result > 0 && result % 2 === 1;
  if (option === 'black') return result > 0 && result % 2 === 0;
  if (option === '1-18') return result >= 1 && result <= 18;
  if (option === '19-36') return result >= 19 && result <= 36;
  if (option === 'even') return result > 0 && result % 2 === 0;
  if (option === 'odd') return result > 0 && result % 2 === 1;
  if (option === '1-12') return result >= 1 && result <= 12;
  if (option === '13-24') return result >= 13 && result <= 24;
  if (option === '25-36') return result >= 25 && result <= 36;
  if (option === '1st') return result >= 1 && result <= 12;
  if (option === '2nd') return result >= 13 && result <= 24;
  if (option === '3rd') return result >= 25 && result <= 36;
  return false;
}

function getMultiplier(option) {
  if (['red', 'black', 'even', 'odd', '1-18', '19-36'].includes(option)) return 2;
  if (['1-12', '13-24', '25-36', '1st', '2nd', '3rd'].includes(option)) return 3;
  return 1;
}