import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const meta = {
  name: 'memory',
  aliases: ['mem', 'tiles'],
  description: 'Memory igra - pronađi sve parove kartica'
};

export async function execute(message, args) {
  const GRID_SIZE = 4;
  const PAIRS = (GRID_SIZE * GRID_SIZE) / 2;
  
  // Kreiraj parove
  const pairs = [];
  for (let i = 1; i <= PAIRS; i++) {
    pairs.push(i, i);
  }
  
  // Izmešaj
  const shuffled = pairs.sort(() => Math.random() - 0.5);
  
  // Kreiraj mrežu
  const grid = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    grid.push(shuffled.slice(i * GRID_SIZE, (i + 1) * GRID_SIZE));
  }
  
  const revealed = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false));
  const matched = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false));
  let moves = 0;
  let pairs_found = 0;
  let selectedIndices = [];
  let gameOver = false;
  let canClick = true;
  
  const createBoard = () => {
    const rows = [];
    
    for (let i = 0; i < GRID_SIZE; i++) {
      const row = new ActionRowBuilder();
      
      for (let j = 0; j < GRID_SIZE; j++) {
        const value = grid[i][j];
        let label = emoji('memory_closed');
        let style = ButtonStyle.Secondary;
        let disabled = gameOver || !canClick;
        
        if (matched[i][j]) {
          label = String(value);
          style = ButtonStyle.Success;
          disabled = true;
        } else if (revealed[i][j]) {
          label = String(value);
          style = ButtonStyle.Primary;
          disabled = !canClick;
        }
        
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`mem_${i}_${j}`)
            .setLabel(label)
            .setStyle(style)
            .setDisabled(disabled)
        );
      }
      rows.push(row);
    }
    
    return rows;
  };
  
  const updateEmbed = () => {
    return new EmbedBuilder()
      .setColor(0x9B59B6)
      .setTitle(`${emoji('memory_open')} Memory Igra`)
      .addFields(
        { name: 'Poteza', value: `${moves}`, inline: true },
        { name: 'Parova Pronađeno', value: `${pairs_found}/${PAIRS}`, inline: true },
        { name: 'Status', value: gameOver ? (pairs_found === PAIRS ? `${emoji('success')} Pobedio!` : `${emoji('error')} Igra Gotova`) : '⏳ U Toku...', inline: true }
      )
      .setFooter({ text: 'Klikni na kartice da ih otkriješ!' });
  };
  
  const msg = await message.reply({
    embeds: [updateEmbed()],
    components: createBoard()
  });
  
  const collector = msg.createMessageComponentCollector({
    time: 600000,
    filter: i => i.user.id === message.author.id
  });
  
  collector.on('collect', async (interaction) => {
    if (gameOver || !canClick) {
      return interaction.deferUpdate().catch(() => {});
    }
    
    const [action, row, col] = interaction.customId.split('_');
    const r = parseInt(row);
    const c = parseInt(col);
    
    // Ako je već otkriveno ili je već u listi
    if (matched[r][c] || selectedIndices.some(idx => idx.r === r && idx.c === c)) {
      return interaction.deferUpdate().catch(() => {});
    }
    
    // Otkri karticu
    revealed[r][c] = true;
    selectedIndices.push({ r, c, value: grid[r][c] });
    
    // Update board odmah da se vidi kartica
    await msg.edit({
      embeds: [updateEmbed()],
      components: createBoard()
    }).catch(() => {});
    
    await interaction.deferUpdate().catch(() => {});
    
    // Ako su 2 kartice odabrane
    if (selectedIndices.length === 2) {
      canClick = false;
      moves++;
      
      const [first, second] = selectedIndices;
      
      // Čekaj 1.2s da vidi obe kartice
      await new Promise(res => setTimeout(res, 1200));
      
      if (first.value === second.value) {
        // Par pronađen!
        matched[first.r][first.c] = true;
        matched[second.r][second.c] = true;
        pairs_found++;
        
        if (pairs_found === PAIRS) {
          gameOver = true;
          
          const winEmbed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle(`${emoji('trophy')} POBEDA!`)
            .setDescription(`Pronašao si sve parove!\n\n${emoji('dice')} Poteza: **${moves}**`)
            .setTimestamp();
          
          await msg.edit({
            embeds: [winEmbed],
            components: createBoard()
          }).catch(() => {});
          
          collector.stop();
          return;
        }
      } else {
        // Parovi se ne poklapaju - zatvori ih
        revealed[first.r][first.c] = false;
        revealed[second.r][second.c] = false;
      }
      
      selectedIndices = [];
      canClick = true;
    }
    
    // Update board nakon što se obradi logika
    await msg.edit({
      embeds: [updateEmbed()],
      components: createBoard()
    }).catch(() => {});
  });
  
  collector.on('end', () => {
    if (!gameOver) {
      const timeoutEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle(`${emoji('timer')} Vreme Isteklo`)
        .setDescription(`Nisu sve kartice pronađene!\n\nPronašao si: ${pairs_found}/${PAIRS} parova`);
      
      msg.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
    }
  });
}