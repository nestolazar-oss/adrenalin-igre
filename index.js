// index.js
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Client,
  GatewayIntentBits,
  Collection,
  Partials,
  EmbedBuilder
} from 'discord.js';
import { connectDB } from "./database/mongo.js";
connectDB();

// utils
import { initUser, getUser, updateUser } from "./database/userDB.js";
import Embeds from './utils/embeds.js';
import { getGiveaways, saveGiveaways } from './utils/giveaways.js';
import { trackInviter } from './utils/trackInviter.js';
import { loadTickets, saveTickets } from './utils/ticketUtils.js';

// games
import { startGuessGameScheduler, handleGuessGame } from './commands/games/guess.js';
import { startWordGameScheduler, handleWordGame } from './commands/games/word.js';

// moderation (command-level handlers)
import { handleAntihoistMember } from './commands/moderation/antihoist.js';

// tickets (command-level)
import { handleTicketCreate } from './commands/tickets/tcreate.js';
import { handleTpanel } from './commands/tickets/tpanel.js';
import { handleTclose } from './commands/tickets/tclose.js';
import { handleTicketDelete } from './commands/tickets/deleteTicket.js';
import { handleTtranscript } from './commands/tickets/transcript.js';
import { handleTicketAddUser } from './commands/tickets/addUser.js';
import { handleTicketRemoveUser } from './commands/tickets/removeUser.js';
import { handleTpriority } from './commands/tickets/tpriority.js';
import { handleTrename } from './commands/tickets/trename.js';
import { handleTalert } from './commands/tickets/talert.js';
import { handleTstats } from './commands/tickets/tstats.js';

// reminders
import { checkReminders } from './commands/general/reminders.js';

// handlers (button/select/modal handlers)
import { handleGiveawayButton } from './handlers/giveawayButtonHandler.js';
import { handleLeaderboardButton } from './handlers/leaderboardButtonHandler.js';
import { setupTracking } from './handlers/trackingHandler.js';
import { handleTicketButton } from './handlers/ticketButtonHandler.js';

// REPORT / MOD HANDLERS (important: from handlers, not from commands)
import { handleReportButtons, handleModInteraction } from './handlers/reportButtonHandler.js';
import { handleModalSubmit } from './handlers/modalsHandler.js';

// TikTok i Quote handlers
import { handleTikTokLinks } from './handlers/tiktokHandler.js';
import { handleQuoteReplies } from './handlers/quoteHandler.js';

// leaderboard - import entire module from commands/general
import * as lbmod from './commands/general/leaderboard.js';

// giveaway selector (optional)
let selectGiveawayWinners = null;
try {
  const mod = await import('./utils/giveawaySelector.js');
  if (mod && typeof mod.selectWinners === 'function')
    selectGiveawayWinners = mod.selectWinners;
} catch (e) {
  // optional, ignore
}

// basics
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User, Partials.Reaction]
});

const PREFIX = process.env.PREFIX || '-';
client.commands = new Collection();

// ========== EMOJIS ==========
global.CUSTOM_EMOJIS = {
  reject: '<:adrenalin_reject:1434629125582225409>',
  accept: '<:adrenalin_accept:1434625582225409>',
  error: '<:adrenalin_reject:1434629125582225409>',
  success: '<:adrenalin_accept:1434629125582225409>',
  warning: '<:adrenalin_warn:1434629908923027479>',
  info: '<:adrenalin_info:1434628553785479392>',
  stats: '<:adrenalin_stats:1434629278007300187>',
  warn: '<:adrenalin_warn:1434629908923027479>',
  tada: '<:adrenalin_tada:1434629556274331728>',
  clock: '<:adrenalin_clock:1434625642061889576>',
  timer: '<:adrenalin_clock:1434625642061889576>',
  tacka: '<:adrenalin_tacka:1434629329328930937>',
  coins: '<:adrenalin_coins:1434624841704800428>',
  bank: '<:adrenalin_bank:1434624812931748021>',
  cash: '💵',
  chat: '<:adrenalin_chat:1434624836751200348>',
  trophy: '<:adrenalin_trophy:1434629562783891546>',
  medal_gold: '🥇',
  medal_silver: '🥈',
  medal_bronze: '🥉',
  repeat: '<:adrenalin_repeat:1434628641299497123>',
  gamepad: '<:adrenalin_gamepad:1434624881408086197>',
  search: '<:adrenalin_search:1434629160759988234>',
  menu: '<:adrenalin_menu:1434628602132959253>',
  wrench: '<:adrenalin_wrench:1434629927738675412>',
  survey: '<:adrenalin_survey:1434628664724553880>',
  fire: '🔥',
  sparkles: '<:adrenalin_heart:1434624891243597825>',
  heart: '❤️',
  celebration: '🎉',
  lightning: '<:adrenalin_friction:1434624879348416683>',
  up: '⬆️',
  down: '⬇️',
  plus: '➕',
  minus: '➖',
  gift: '<:adrenalin_gift:1434625847867867247>',
  hammer: '<:adrenalin_ban:1434624811354685593>',
  ticket: '<:adrenalin_ticket:1434629557691879647>',
  recirculate: '♻️',
  loading: '⏳',
  dice: '🎲',
  target: '🎯',
  bomb: '💣',
  gem: '💎',
  ice: '❄️',
  flag: '🚩',
  money_bag: '💸',
  wallet: '<:adrenalin_bank_balance:1434625581617512520>',
  linked: '<:adrenalin_unlinked:1434629564511813662>',
};

global.emoji = (k) => CUSTOM_EMOJIS[k] || '❓';

// ========== DATABASE ==========

// ========== LOAD COMMANDS ==========
async function loadCommands() {
  const commandsDir = path.join(__dirname, 'commands');
  if (!fs.existsSync(commandsDir)) return;

  const categories = fs.readdirSync(commandsDir);

  for (const category of categories) {
    const categoryPath = path.join(commandsDir, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;

    const files = fs
      .readdirSync(categoryPath)
      .filter((f) => f.endsWith('.js'));

    for (const file of files) {
      // Skip leaderboard here - registrujemo je posebno ispod
      if (file === 'leaderboard.js' && category === 'general') continue;

      const filePath = path.join(categoryPath, file);

      try {
        const commandModule = await import(`file://${filePath}`);

        if (commandModule.meta && commandModule.execute) {
          client.commands.set(commandModule.meta.name, commandModule);

          if (commandModule.meta.aliases) {
            for (const a of commandModule.meta.aliases)
              client.commands.set(a, commandModule);
          }

          console.log(`✅ Loaded: ${commandModule.meta.name}`);
        }
      } catch (err) {
        console.error(`❌ Error loading ${filePath}:`, err.message);
      }
    }
  }
}

// Register leaderboard explicitly
function registerLeaderboard() {
  try {
    if (lbmod && lbmod.meta && lbmod.execute) {
      client.commands.set(lbmod.meta.name, lbmod);
      if (Array.isArray(lbmod.meta.aliases)) {
        for (const a of lbmod.meta.aliases) {
          client.commands.set(a, lbmod);
        }
      }
      console.log(`✅ Loaded: ${lbmod.meta.name}`);
    }
  } catch (e) {
    console.error('❌ Error registering leaderboard:', e.message);
  }
}

// ========== READY EVENT ==========
client.once('ready', async () => {
  console.log(`\n🤖 Bot online as ${client.user.tag}\n`);

  client.user.setActivity(`${PREFIX}help`, { type: 'WATCHING' });

  try { 
    setupTracking(client);
    console.log('✅ Tracking enabled (voice + messages)');
  } catch (e) { 
    console.error('❌ Tracking error:', e.message); 
  }

  try { 
    startGuessGameScheduler(client);
    console.log('✅ Guess Game Scheduler started');
  } catch (e) { 
    console.error('❌ Guess Game error:', e.message); 
  }

  try { 
    startWordGameScheduler(client);
    console.log('✅ Word Game Scheduler started');
  } catch (e) { 
    console.error('❌ Word Game error:', e.message); 
  }

  setInterval(() => {
    try { 
      checkReminders(client); 
    } catch (e) { 
      console.error('❌ Reminders error:', e.message); 
    }
  }, 60_000);

  console.log('✅ All systems online!\n');
});

// ========== MESSAGE COMMAND HANDLER ==========
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // TikTok i Quote handleri
  try { await handleTikTokLinks(message); } catch (e) { console.error('TikTok error:', e.message); }
  try { await handleQuoteReplies(message); } catch (e) { console.error('Quote error:', e.message); }

  // Game handlers
  try { await handleGuessGame(message); } catch (e) { /* ignore */ }
  try { await handleWordGame(message); } catch (e) { /* ignore */ }

  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const cmdName = args.shift()?.toLowerCase();

  if (!cmdName) return;

  const command = client.commands.get(cmdName);

  if (!command) return;

  try {
    await command.execute(message, args);
  } catch (err) {
    console.error(`❌ Error in ${cmdName}:`, err.message);

    const errEmbed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`${emoji('error')} Greška`)
      .setDescription(`Dogodila se greška:\n\`${err.message}\``)
      .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    try { 
      await message.reply({ embeds: [errEmbed] }); 
    } catch (e) { 
      console.error('Error sending error embed:', e.message); 
    }
  }
});

// ========== INTERACTION HANDLER ==========
client.on('interactionCreate', async (interaction) => {
  try {
    // MODAL SUBMITS MUST BE HANDLED FIRST
    if (interaction.isModalSubmit && interaction.isModalSubmit()) {
      try {
        return await handleModalSubmit(interaction);
      } catch (e) {
        console.error('Modal handler error:', e);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: `${emoji('error')} Greška u modalu.`, ephemeral: true });
        }
        return;
      }
    }

    // String select menu (timeout select) - prefer check
    if (interaction.isStringSelectMenu && interaction.isStringSelectMenu()) {
      const customId = interaction.customId || '';
      if (customId.startsWith('mod_timeout_select_')) {
        try {
          return await handleModInteraction(interaction);
        } catch (e) {
          console.error('Mod interaction (select) error:', e);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `${emoji('error')} Greška u selektu.`, ephemeral: true });
          }
          return;
        }
      }
    }

    // Buttons
    if (interaction.isButton && interaction.isButton()) {
      const customId = interaction.customId || '';

      // REPORTS (approve/reject/delete)
      if (customId.startsWith('report_')) {
        try { 
          return await handleReportButtons(interaction); 
        } catch (e) { 
          console.error('handleReportButtons error:', e); 
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `${emoji('error')} Greška pri obradi report dugmeta.`, ephemeral: true });
          }
          return;
        }
      }

      // MOD ACTIONS (ban/kick/warn) - buttons
      if (customId.startsWith('mod_')) {
        try {
          return await handleModInteraction(interaction);
        } catch (e) {
          console.error('handleModInteraction error:', e);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `${emoji('error')} Greška pri obradi mod dugmeta.`, ephemeral: true });
          }
          return;
        }
      }

      // GIVEAWAY JOIN
      if (customId.startsWith('giveaway_join_')) {
        return await handleGiveawayButton(interaction);
      }

      // TICKETS
      if (customId.startsWith('ticket_') || customId.startsWith('t.')) {
        return await handleTicketButton(interaction, client);
      }

      // LEADERBOARD
      if (customId.startsWith('lb_') || 
          customId === 'lb-prev' || 
          customId === 'lb-next' || 
          customId === 'lb-refresh' || 
          customId === 'lb-end') {
        return await handleLeaderboardButton(interaction);
      }
    }
  } catch (e) {
    console.error('❌ Interaction error:', e);
    
    if (!interaction.replied && !interaction.deferred) {
      try { 
        await interaction.reply({ 
          content: `${emoji('error')} Greška u interakciji.`, 
          ephemeral: true 
        }); 
      } catch (err) { 
        console.error('Error replying to interaction:', err.message); 
      }
    }
  }
});

// ========== BOT LOGIN ==========
(async () => {
  console.log('🔄 Loading commands...');
  await loadCommands();
  registerLeaderboard();

  console.log('🔗 Connecting to Discord...');
  await client.login(process.env.DISCORD_TOKEN || '');
})();

export { client };