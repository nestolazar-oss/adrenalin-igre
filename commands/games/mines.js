import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { initUser, updateUser } from '../../database/userDB.js';

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
    return message.reply(`${emoji('reject')} Koristi: \`-mines <bet|all|half> [broj mina 3-11]\``);
  }

  if (bet === 'all') bet = user.cash;
  else if (bet === 'half') bet = Math.floor(user.cash / 2);
  else bet = parseInt(bet);

  if (isNaN(bet) || bet <= 0) 
    return message.reply(`${emoji('reject')} Unesite validan ulog!`);
  if (bet > user.cash) 
    return message.reply(`${emoji('reject')} Nemate toliko novca!`);
  if (mineCount < 3 || mineCount > 11) 
    return message.reply(`${emoji('reject')} Broj mina mora biti između 3 i 11!`);

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
    const emptyLabel = '\u2800';

    for (let i = 0; i < 3; i++) {
      const row = new ActionRowBuilder();

      for (let j = 0; j < 4; j++) {
        const index = i * 4 + j;

        let style = ButtonStyle.Secondary;
        let label = emptyLabel;
        let disabled = false;

        if (gameOver && mines.has(index)) {
          style = ButtonStyle.Danger;
          label = emoji('bomb');
          disabled = true;
        } else if (revealed.has(index)) {
          if (mines.has(index)) {
            style = ButtonStyle.Danger;
            label = emoji('bomb');
            disabled = true;
          } else {
            style = ButtonStyle.Success;
            label = emoji('success');
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
      .setTitle(`${emoji('tacka')} Mines - Ulog: ${emoji('coins')} ${bet}`)
      .addFields(
        { name: 'Otkriveno', value: `${safeRevealed}/${SAFE_FIELDS}`, inline: true },
        { name: 'Mine', value: `${mineCount}`, inline: true },
        { name: `${emoji('lightning')} Multiplikator`, value: `${multiplier}x`, inline: true },
        { name: 'Potencijalni dobitak', value: `${emoji('coins')} ${winnings.toLocaleString()}`, inline: false }
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

    if (customId.startsWith('mine_') && !customId.includes('cashout') && !customId.includes('exit')) {
      const index = parseInt(customId.split('_')[1]);

      if (revealed.has(index)) return interaction.deferUpdate();

      if (mines.has(index)) {
        gameOver = true;
        lost = true;
        revealed.add(index);

        const loseEmbed = new EmbedBuilder()
          .setColor('#E74C3C')
          .setTitle(`${emoji('reject')} GAME OVER - Pogodio si minu!`)
          .setDescription(`Izgubio si ${emoji('coins')} **${bet}**`)
          .addFields(
            { name: 'Stanje', value: `${emoji('bank')} ${user.cash.toLocaleString()}`, inline: false },
            { name: 'Rezultat', value: `-${emoji('coins')} ${bet}`, inline: true }
          );

        await interaction.update({
          embeds: [loseEmbed],
          components: createBoard()
        });

        return collector.stop();
      }

      revealed.add(index);

      return interaction.update({
        embeds: [updateEmbed()],
        components: createBoard()
      });
    }

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
        .setDescription(`Profit: ${emoji('coins')} **${profit}**`)
        .addFields(
          { name: 'Isplata', value: `${emoji('coins')} ${winnings.toLocaleString()}`, inline: true },
          { name: 'Profit', value: `${emoji('coins')} +${profit}`, inline: true },
          { name: 'Stanje', value: `${emoji('bank')} ${user.cash.toLocaleString()}`, inline: false },
          { name: 'Otkrivena polja', value: `${emoji('tacka')} ${revealed.size}/${SAFE_FIELDS}`, inline: true }
        );

      await interaction.update({
        embeds: [winEmbed],
        components: createBoard()
      });

      return collector.stop();
    }

    if (customId === `mine_exit_${userId}`) {
      gameOver = true;

      const exitEmbed = new EmbedBuilder()
        .setColor('#F1C40F')
        .setTitle('Napustio si igru')
        .setDescription(`Izgubio si ${emoji('coins')} **${bet}**`)
        .addFields(
          { name: 'Stanje', value: `${emoji('bank')} ${user.cash.toLocaleString()}`, inline: false },
          { name: `${emoji('warn')} Napomena`, value: `Odustao si nakon ${revealed.size} otkrivenih polja.`, inline: false }
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