const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const FLAGS = [{ country: 'Japan', flag: '🇯🇵' }, { country: 'Brazil', flag: '🇧🇷' }, { country: 'France', flag: '🇫🇷' }];
function pickFlag() { return FLAGS[Math.floor(Math.random() * FLAGS.length)]; }

module.exports = {
  data: new SlashCommandBuilder().setName('flags').setDescription('Guess the flag'),
  async executeMessage(message) { await run({ type: 'message', message }); },
  async executeInteraction(interaction) { await interaction.deferReply(); await run({ type: 'interaction', interaction }); }
};

async function run({ type, message, interaction }) {
  const channel = type === 'message' ? message.channel : interaction.channel;
  async function startRound(starterId) {
    const round = pickFlag();
    const embed = new EmbedBuilder().setTitle('Koja je ovo država?').setDescription(`${round.flag}`).setColor('Blue');
    await channel.send({ embeds: [embed] });
    const filter = m => !m.author.bot;
    const collected = await channel.awaitMessages({ filter, max: 1, time: 30000 });
    const guess = collected.first();
    if (!guess) return channel.send('Niko nije pogodio. Kraj runde.');
    if (guess.content.toLowerCase().includes(round.country.toLowerCase())) {
      const winEmbed = new EmbedBuilder().setTitle('Pogodak!').setDescription(`${guess.author} pogodio je: **${round.country}**`).setColor('Green');
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('flags_playagain').setLabel('Play again').setStyle(ButtonStyle.Secondary));
      const winMsg = await channel.send({ embeds: [winEmbed], components: [row] });
      const collector = winMsg.createMessageComponentCollector({ filter: i => i.customId === 'flags_playagain' && i.user.id === guess.author.id, time: 60000, max: 1 });
      collector.on('collect', async i => { await i.deferUpdate(); startRound(guess.author.id); });
    } else {
      channel.send(`${guess.author} nije pogodio.`);
    }
  }
  startRound(type === 'message' ? message.author.id : interaction.user.id);
}