import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { initUser, updateUser } from '../../utils/db.js';

export const meta = {
  name: 'mines',
  description: 'Igraj Mines - pronađi blago, izbjegni mine'
};

export async function execute(message, args) {
  const userId = message.author.id;
  const user = initUser(userId);
  let bet = args[0];
  const mineCount = parseInt(args[1]) || 3;

  if (!bet) {
    return message.reply('<:adrenalin_reject:1434629125582225409> Koristi: `-mines <bet|all|half> [broj mina 3-11]`');
  }

  if (bet === 'all') bet = user.cash;
  else if (bet === 'half') bet = Math.floor(user.cash / 2);
  else bet = parseInt(bet);

  if (isNaN(bet) || bet <= 0) 
    return message.reply('<:adrenalin_reject:1434629125582225409> Unesite validan ulog!');
  if (bet > user.cash) 
    return message.reply('<:adrenalin_reject:1434629125582225409> Nemate toliko novca!');
  if (mineCount < 3 || mineCount > 11) 
    return message.reply('<:adrenalin_reject:1434629125582225409> Broj mina mora biti između 3 i 11!');

  user.cash -= bet;
  updateUser(userId, user);

  const TOTAL_FIELDS = 12;
  const SAFE_FIELDS = TOTAL_FIELDS - mineCount;
  const mines = new Set();

  while (mines.size < mineCount) {
    mines.add(Math.floor(Math.random() * TOTAL_FIELDS));
  }

  const revealed = new Set();
  let gameOver = false;
  let lost = false;

  // FAIR MULTIPLIER
  const getMultiplier = (safeRevealed) => {
    if (safeRevealed <= 0) return 1;
    let prob = 1;
    const safe = TOTAL_FIELDS - mineCount;

    for (let i = 0; i < safeRevealed; i++) {
      const safeRemaining = safe - i;
      const totalRemaining = TOTAL_FIELDS - i;
      prob *= safeRemaining / totalRemaining;
    }
    return Number((1 / prob).toFixed(2));
  };

 const createBoard = () => {
  const rows = [];
  const emptyLabel = '\u2800'; // Nevidljiv karakter

  for (let i = 0; i < 3; i++) {
    const row = new ActionRowBuilder();

    for (let j = 0; j < 4; j++) {
      const index = i * 4 + j;

      let style = ButtonStyle.Secondary;
      let label = emptyLabel;
      let disabled = false;

      if (gameOver && mines.has(index)) {
        style = ButtonStyle.Danger;
        label = '💣';
        disabled = true;
      } else if (revealed.has(index)) {
        if (mines.has(index)) {
          style = ButtonStyle.Danger;
          label = '💣';
          disabled = true;
        } else {
          style = ButtonStyle.Success;
          label = '✅';
          disabled = true;
        }
      } else {
        disabled = gameOver;
      }

      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`mine_${index}_${userId}`)
          .setLabel(label)
          .setStyle(style)
          .setDisabled(disabled)
      );
    }

    rows.push(row);
  }

  // CASHOUT i EXIT — bez emoji-ja
  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`mine_cashout_${userId}`)
        .setLabel('Cashout')
        .setStyle(ButtonStyle.Success)
        .setDisabled(gameOver || revealed.size === 0),
      new ButtonBuilder()
        .setCustomId(`mine_exit_${userId}`)
        .setLabel('Exit')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(gameOver)
    )
  );

  return rows;
};


  const updateEmbed = () => {
    const safeRevealed = revealed.size;
    const multiplier = getMultiplier(safeRevealed);
    const winnings = Math.floor(bet * multiplier);

    return new EmbedBuilder()
      .setColor('#2596BE')
      .setTitle(`<:adrenalin_tacka:1434629329328930937> Mines - Ulog: <:adrenalin_coins:1434624841704800428> ${bet}`)
      .addFields(
        { name: 'Otkriveno', value: `${safeRevealed}/${SAFE_FIELDS}`, inline: true },
        { name: 'Mine', value: `${mineCount}`, inline: true },
        { name: '<:adrenalin_friction:1434624879348416683> Multiplikator', value: `${multiplier}x`, inline: true },
        { name: 'Potencijalni dobitak', value: `<:adrenalin_coins:1434624841704800428> ${winnings.toLocaleString()}`, inline: false }
      )
      .setFooter({ text: `Rizik: ${((mineCount / TOTAL_FIELDS) * 100).toFixed(1)}%` });
  };

  const msg = await message.reply({
    embeds: [updateEmbed()],
    components: createBoard()
  });

  const collector = msg.createMessageComponentCollector({
    time: 300000,
    filter: (i) => i.user.id === userId
  });

  collector.on('collect', async (interaction) => {
    const customId = interaction.customId;

    if (gameOver) return interaction.deferUpdate();

    // CLICK POLJE
    if (customId.startsWith('mine_') && !customId.includes('cashout') && !customId.includes('exit')) {
      const index = parseInt(customId.split('_')[1]);

      if (revealed.has(index)) return interaction.deferUpdate();

      // Bomba
      if (mines.has(index)) {
        gameOver = true;
        lost = true;
        revealed.add(index);

        const loseEmbed = new EmbedBuilder()
          .setColor('#E74C3C')
          .setTitle('<:adrenalin_reject:1434629125582225409> GAME OVER - Pogodio si minu!')
          .setDescription(`Izgubio si <:adrenalin_coins:1434624841704800428> **${bet}**`)
          .addFields(
            { name: 'Stanje', value: `<:adrenalin_bank_balance:1434625581617512520> ${user.cash.toLocaleString()}`, inline: false },
            { name: 'Rezultat', value: `-<:adrenalin_coins:1434624841704800428> ${bet}`, inline: true }
          );

        await interaction.update({
          embeds: [loseEmbed],
          components: createBoard()
        });

        return collector.stop();
      }

      // Safe
      revealed.add(index);

      return interaction.update({
        embeds: [updateEmbed()],
        components: createBoard()
      });
    }

    // CASHOUT
    if (customId === `mine_cashout_${userId}`) {
      gameOver = true;

      const multiplier = getMultiplier(revealed.size);
      const winnings = Math.floor(bet * multiplier);
      const profit = winnings - bet;

      user.cash += winnings;
      updateUser(userId, user);

      const winEmbed = new EmbedBuilder()
        .setColor('#2ECC71')
        .setTitle('CASHOUT uspešan!')
        .setDescription(`Profit: <:adrenalin_coins:1434624841704800428> **${profit}**`)
        .addFields(
          { name: 'Isplata', value: `<:adrenalin_coins:1434624841704800428> ${winnings.toLocaleString()}`, inline: true },
          { name: 'Profit', value: `<:adrenalin_coins:1434624841704800428> +${profit}`, inline: true },
          { name: 'Stanje', value: `<:adrenalin_bank_balance:1434625581617512520> ${user.cash.toLocaleString()}`, inline: false },
          { name: 'Otkrivena polja', value: `<:adrenalin_tacka:1434629329328930937> ${revealed.size}/${SAFE_FIELDS}`, inline: true }
        );

      await interaction.update({
        embeds: [winEmbed],
        components: createBoard()
      });

      return collector.stop();
    }

    // EXIT
    if (customId === `mine_exit_${userId}`) {
      gameOver = true;

      const exitEmbed = new EmbedBuilder()
        .setColor('#F1C40F')
        .setTitle('Napustio si igru')
        .setDescription(`Izgubio si <:adrenalin_coins:1434624841704800428> **${bet}**`)
        .addFields(
          { name: 'Stanje', value: `<:adrenalin_bank_balance:1434625581617512520> ${user.cash.toLocaleString()}`, inline: false },
          { name: '<:adrenalin_warn:1434629908923027479> Napomena', value: `Odustao si nakon ${revealed.size} otkrivenih polja.`, inline: false }
        );

      await interaction.update({
        embeds: [exitEmbed],
        components: createBoard()
      });

      return collector.stop();
    }

    interaction.deferUpdate();
  });

collector.on('end', async () => {
    try {
        await msg.edit({ components: msg.components });
    } catch {}
  });
}
