import 'dotenv/config';
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadDB } from './utils/db.js';
// Import game schedulers
import { startGuessGameScheduler, handleGuessGame } from './commands/games/guess.js';
import { startWordGameScheduler, handleWordGame } from './commands/games/word.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ]
});

const PREFIX = process.env.PREFIX || '-';
client.commands = new Collection();

// Load database
loadDB();

// Load all commands dynamically
async function loadCommands() {
  const commandsDir = path.join(__dirname, 'commands');
  
  const categories = fs.readdirSync(commandsDir);
  
  for (const category of categories) {
    const categoryPath = path.join(commandsDir, category);
    
    if (!fs.statSync(categoryPath).isDirectory()) continue;
    
    const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));
    
    for (const file of files) {
      const filePath = path.join(categoryPath, file);
      const command = await import(`file://${filePath}`);
      
      if (command.meta && command.execute) {
        client.commands.set(command.meta.name, command);
        
        // Add aliases
        if (command.meta.aliases) {
          command.meta.aliases.forEach(alias => {
            client.commands.set(alias, command);
          });
        }
        
        console.log(`✅ Loaded command: ${command.meta.name}`);
      }
    }
  }
}

client.once('ready', async () => {
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Bot is online as ${client.user.tag}`);
  console.log(`Prefix: ${PREFIX}`);
  console.log(`Commands: ${client.commands.size}`);
  console.log('='.repeat(50) + '\n');
  
  client.user.setActivity(`${PREFIX}help`, { type: 'WATCHING' });
  
  // START AUTO GAMES
  startGuessGameScheduler(client);
  startWordGameScheduler(client);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  // AUTO GAMES - check if message is in game channels
  await handleGuessGame(message);
  await handleWordGame(message);
  
  if (!message.content.startsWith(PREFIX)) return;
  
  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();
  
  if (!commandName) return;
  
  const command = client.commands.get(commandName);
  
  if (!command) {
    if (commandName === 'help') {
      return message.reply(`❌ Command not found. Use \`${PREFIX}help\``);
    }
    return;
  }
  
  try {
    await command.execute(message, args);
  } catch (error) {
    console.error(`Error executing command ${commandName}:`, error);
    message.reply('❌ An error occurred while executing the command!').catch(() => {});
  }
});

// Load commands
await loadCommands();

// Login
client.login(process.env.DISCORD_TOKEN);