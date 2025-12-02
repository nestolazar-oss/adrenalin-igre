const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('template').setDescription('Template command'),
  async executeMessage(message, args, client) {
    return this.run({ type: 'message', message, args, client });
  },
  async executeInteraction(interaction, client) {
    await interaction.deferReply();
    return this.run({ type: 'interaction', interaction, client });
  },
  async run(context) {
    const { type, message, interaction } = context;
    const reply = (payload) => {
      if (type === 'message') return message.channel.send(payload);
      return interaction.editReply(payload);
    };
    return reply('This command works as both slash and message based.');
  }
};