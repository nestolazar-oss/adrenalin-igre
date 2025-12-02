const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { safeInc } = require('../utils/economy');

module.exports = {
  data: new SlashCommandBuilder().setName('giveaway').setDescription('Start a giveaway').addStringOption(o => o.setName('participants').setDescription('Mention list or ids separated by space').setRequired(true)),
  async executeMessage(message, args, client) { await run({ type: 'message', message, args, client }); },
  async executeInteraction(interaction, client) { await interaction.deferReply(); await run({ type: 'interaction', interaction, client }); }
};

async function run({ type, message, interaction, args, client }) {
  // participants parsing
  const raw = type === 'message' ? (args || []).join(' ') : interaction.options.getString('participants');
  const parts = raw.split(/\s+/).map(p => p.replace(/[<@!>]/g, '')).filter(p => p);
  const participants = parts.filter(p => !isNaN(p));
  if (!participants.length) {
    const txt = 'Nema učesnika.';
    if (type === 'message') return message.reply(txt);
    return interaction.editReply({ content: txt });
  }
  const tried = new Set();
  async function tryPick() {
    const remaining = participants.filter(id => !tried.has(id));
    if (!remaining.length) {
      const txt = 'Niko se nije javio za nagradu.';
      if (type === 'message') return message.channel.send(txt);
      return interaction.editReply({ content: txt });
    }
    const pick = remaining[Math.floor(Math.random() * remaining.length)];
    tried.add(pick);
    try {
      const user = await (client.users.fetch ? client.users.fetch(pick, { force: true }) : client.users.fetch(pick));
      const embed = new EmbedBuilder().setTitle('Dobitnik giveaway-a!').setDescription('Klikni "Claim" u roku od 10 sekundi da preuzmeš nagradu.').setColor('Green');
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`giveaway_claim_${Date.now()}`).setLabel('Claim').setStyle(ButtonStyle.Primary));
      const dmMsg = await user.send({ embeds: [embed], components: [row] });
      const filter = i => i.user.id === pick && i.customId.startsWith('giveaway_claim_');
      const collector = dmMsg.createMessageComponentCollector({ filter, time: 10000, max: 1 });
      let claimed = false;
      collector.on('collect', async interactionC => {
        claimed = true;
        await interactionC.update({ embeds: [new EmbedBuilder().setTitle('Nagrada potvrđena').setDescription('Čestitamo!').setColor('Green')], components: [] });
        await safeInc(pick, 'cash', 1000);
        const notify = `<@${pick}> je potvrdio nagradu!`;
        if (type === 'message') message.channel.send(notify); else interaction.editReply({ content: notify });
      });
      collector.on('end', async collected => {
        if (!claimed) {
          try { await dmMsg.edit({ content: 'Niko nije potvrdio u roku.', components: [] }); } catch (e) {}
          await tryPick();
        }
      });
    } catch (err) {
      await tryPick();
    }
  }
  await tryPick();
}