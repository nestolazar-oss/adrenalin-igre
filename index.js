require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { connect } = require('./utils/mongoose');
const { loadCommands } = require('./handlers/commandLoader');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages], partials: [Partials.Channel] });

(async () => {
  await connect(process.env.MONGO_URI);
  loadCommands(client);

  client.on('messageCreate', async message => {
    if (message.author.bot) return;
    const prefix = process.env.PREFIX || '&';
    if (!message.content.startsWith(prefix)) return;
    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();
    const cmd = client.commands.get(commandName);
    if (!cmd || !cmd.executeMessage) return;
    try { await cmd.executeMessage(message, args, client); } catch (err) { console.error(err); message.reply('Došlo je do greške.'); }
  });

  client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand && !interaction.isChatInputCommand()) return;
    if (!interaction.isChatInputCommand()) return;
    const cmd = client.commands.get(interaction.commandName);
    if (!cmd || !cmd.executeInteraction) return;
    try { await cmd.executeInteraction(interaction, client); } catch (err) { console.error(err); if (!interaction.replied) await interaction.reply({ content: 'Došlo je do greške.', ephemeral: true }); }
  });

  await client.login(process.env.DISCORD_TOKEN);
  console.log('Bot started');
})();