import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { initUser, updateUser } from '../../database/userDB.js';

export const meta = {
  name: 'towers',
  description: 'Igraj Kule - Penji se i cashoutaj pre nego što pogodiš bombu'
};

export async function execute(message, args) {
  const user = initUser(message.author.id);
  let bet = args[0];

  if (!bet) {
    return message.reply(`${emoji('error')} Koristi: \`-towers <bet|all|half>\``);
  }

  if (bet === 'all') bet = user.cash;
  else if (bet === 'half') bet = Math.floor(user.cash / 2);
  else bet = parseInt(bet);

  if (isNaN(bet) || bet <= 0) return message.reply(`${emoji('error')} Unesite validan ulog!`);
  if (bet > user.cash) return message.reply(`${emoji('error')} Nemate toliko novca!`);

  user.cash -= bet;
  updateUser(message.author.id, user);

  const LEVELS = 10;
  const towers = Array(LEVELS).fill(0).map(() => Math.random() > 0.5 ? emoji('bomb') : emoji('gem'));
  const revealed = new Array(LEVELS).fill(false);

  let currentLevel = 0;
  let gameOver = false;
  let currentWinnings = bet;

  const createBoard = () => {
    const rows = [];

    for (let i = 0; i < LEVELS; i += 3) {
      const row = new ActionRowBuilder();

      for (let j = 0; j < 3 && i + j < LEVELS; j++) {
        const level = i + j;

        let style = ButtonStyle.Secondary;
        let label = `${level + 1}`;

        if (revealed[level]) {
          if (towers[level] === emoji('bomb')) {
            style = ButtonStyle.Danger;
            label = emoji('bomb');
          } else {
            style = ButtonStyle.Success;
            label = emoji('gem');
          }
        }

        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`tower_level_${level}`)
            .setLabel(label)
            .setStyle(style)
            .setDisabled(gameOver || revealed[level] || level < currentLevel)
        );
      }

      rows.push(row);
    }

    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('towers_cashout')
          .setLabel('Cashout')
          .setStyle(ButtonStyle.Success)
          .setDisabled(gameOver || currentLevel === 0),

        new ButtonBuilder()
          .setCustomId('towers_exit')
          .setLabel('Exit')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(gameOver)
      )
    );

    return rows;
  };

  const updateEmbed = () => {
    return new EmbedBuilder()
      .setColor(0x2596BE)
      .setTitle(`${emoji('target')} Towers - Ulog: $${bet}`)
      .addFields(
        { name: `${emoji('dice')} Level`, value: `${currentLevel}/${LEVELS}`, inline: true },
        { name: `${emoji('lightning')} Multiplikator`, value: `${(1 + currentLevel * 0.25).toFixed(2)}x`, inline: true },
        { name: `${emoji('coins')} Moguća nagrada`, value: `$${currentWinnings}`, inline: true }
      )
      .setFooter({ text: 'Svakim levelom multiplikator raste!' });
  };

  const msg = await message.reply({
    embeds: [updateEmbed()],
    components: createBoard()
  });

  const collector = msg.createMessageComponentCollector({ time: 300000 });

  collector.on('collect', async (interaction) => {
    if (interaction.user.id !== message.author.id) {
      return interaction.reply({ content: `${emoji('error')} Ovo nije tvoja igra!`, ephemeral: true });
    }

    const id = interaction.customId;

    if (id.startsWith('tower_level_')) {
      const level = parseInt(id.replace('tower_level_', ''));

      if (level !== currentLevel) {
        return interaction.reply({ content: `${emoji('error')} Moraš ići po redu!`, ephemeral: true });
      }

      revealed[level] = true;

      if (towers[level] === emoji('bomb')) {
        gameOver = true;

        const loseEmbed = new EmbedBuilder()
          .setColor(0xE74C3C)
          .setTitle(`${emoji('bomb')} Pogodio Si Bombu!`)
          .setDescription(`Izgubio si $${bet}`)
          .addFields({ name: `${emoji('cash')} Nova gotovina`, value: `$${user.cash}` });

        collector.stop();
        return interaction.update({
          embeds: [loseEmbed],
          components: createBoard()
        });
      }

      currentLevel++;
      currentWinnings = Math.floor(bet * (1 + currentLevel * 0.25));

      if (currentLevel >= LEVELS) {
        gameOver = true;
        user.cash += currentWinnings;
        updateUser(message.author.id, user);

        const winEmbed = new EmbedBuilder()
          .setColor(0x2ECC71)
          .setTitle(`${emoji('celebration')} Stigao Si na Vrh!`)
          .setDescription(`Zaradio si **$${currentWinnings - bet}**!`)
          .addFields(
            { name: `${emoji('coins')} Nagrada`, value: `$${currentWinnings}`, inline: true },
            { name: `${emoji('cash')} Nova gotovina`, value: `$${user.cash}`, inline: true }
          );

        collector.stop();
        return interaction.update({
          embeds: [winEmbed],
          components: createBoard()
        });
      }

      return interaction.update({
        embeds: [updateEmbed()],
        components: createBoard()
      });
    }

    if (id === 'towers_cashout') {
      gameOver = true;
      user.cash += currentWinnings;
      updateUser(message.author.id, user);

      const cashoutEmbed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle(`${emoji('celebration')} Uspešan Cashout!`)
        .setDescription(`Zaradio si **$${currentWinnings - bet}**!`)
        .addFields(
          { name: `${emoji('coins')} Nagrada`, value: `$${currentWinnings}`, inline: true },
          { name: `${emoji('cash')} Nova gotovina`, value: `$${user.cash}`, inline: true }
        );

      collector.stop();
      return interaction.update({
        embeds: [cashoutEmbed],
        components: createBoard()
      });
    }

    if (id === 'towers_exit') {
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