import 'dotenv/config';
import { Client, GatewayIntentBits, Collection, Partials, EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadDB } from './utils/db.js';

// Import game schedulers
import { startGuessGameScheduler, handleGuessGame } from './commands/games/guess.js';
import { startWordGameScheduler, handleWordGame } from './commands/games/word.js';

// Import moderation handlers
import { handleAntihoistMember } from './commands/moderation/antihoist.js';
import { handleReportButtons } from './commands/moderation/report.js';

// Import ticket handlers (added)
import { trackInviter } from './utils/trackInviter.js';
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



// Import general handlers
import { execute_invites, meta_invites } from './commands/general/invites.js';
import { checkReminders } from './commands/general/reminders.js';

// (Optional) Giveaways utils if used (some parts of your file call getGiveaways/saveGiveaways)
import { getGiveaways, saveGiveaways } from './utils/giveaways.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
    Partials.Reaction
  ]
});

const PREFIX = process.env.PREFIX || '&';
client.commands = new Collection();

// ========== CUSTOM EMOJI-JI ==========
global.CUSTOM_EMOJIS = {
  reject: '<:adrenalin_reject:1434629125582225409>',
  accept: '<:adrenalin_accept:1434629125582225409>',
  error: '❌',
  success: '✅',
  warning: '⚠️',
  info: 'ℹ',
  stats: '<:adrenalin_stats:1434629278007300187>',
  warn: '<:adrenalin_warn:1434629908923027479>',
  tada: '<:adrenalin_tada:1434629556274331728>',
  clock: '<:adrenalin_clock:1434625642061889576>',
  timer: '⏲️',
  tacka: '<:adrenalin_tacka:1434629329328930937>',
  coins: '<:adrenalin_coins:1434624841704800428>',
  bank: '<:adrenalin_bank_balance:1434625581617512520>',
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
  sparkles: '✨',
  heart: '❤️',
  celebration: '🎉',
  lightning: '<:adrenalin_friction:1434624879348416683>'
};

global.emoji = (key) => CUSTOM_EMOJIS[key] || '❓';

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

      // Load alternate meta exports (meta_*, execute_*)
      for (const [key, value] of Object.entries(command)) {
        if (key.startsWith('meta_') && value && value.name) {
          const altName = key.replace('meta_', '');
          const executeFunc = command[`execute_${altName}`];
          
          if (executeFunc) {
            client.commands.set(value.name, {
              meta: value,
              execute: executeFunc
            });

            if (value.aliases) {
              value.aliases.forEach(alias => {
                client.commands.set(alias, { meta: value, execute: executeFunc });
              });
            }

            console.log(`✅ Loaded command: ${value.name}`);
          }
        }
      }
    }
  }
}

// ========== READY EVENT ==========
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

  // CHECK REMINDERS EVERY MINUTE
  setInterval(() => checkReminders(client), 60000);
});

// ========== MESSAGE CREATE EVENT ==========
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

// ========== GUILD MEMBER ADD EVENT ==========
client.on('guildMemberAdd', async (member) => {
  console.log(`✅ ${member.user.tag} pridružio/la se serveru`);
  
  // Antihoist sistem
  await handleAntihoistMember(member);
  
  // Invite tracker
  await trackInviter(member, client);
});

// ========== GUILD MEMBER UPDATE EVENT ==========
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  // Antihoist - ako se nadimak promenio
  if (oldMember.displayName !== newMember.displayName) {
    await handleAntihoistMember(newMember);
  }
});

// ========== VOICE STATE UPDATE EVENT ==========
client.on('voiceStateUpdate', async (oldState, newState) => {
  // Praćenje voice aktivnosti (opciono - može se dodati logika)
  if (!oldState.channel && newState.channel) {
    console.log(`🎤 ${newState.member.user.tag} se pridružio voice kanalu`);
  }
});

// ========== INTERACTION CREATE EVENT ==========
client.on('interactionCreate', async (interaction) => {
  // Report sistem - button reactions
  if (interaction.isButton()) {
    await handleReportButtons(interaction);

    // Ticket create button (panel)
    await handleTicketCreate(interaction);

    // Ticket buttons (close, transcript, delete, add, remove, rename, priority, alert, stats)
    // Each handler is called safely inside try/catch to avoid one failing handler blocking others
    try { await handleTicketClose(interaction); } catch (e) { /* ignore */ }
    try { await handleTicketDelete(interaction); } catch (e) { /* ignore */ }
    try { await handleTicketTranscript(interaction); } catch (e) { /* ignore */ }
    try { await handleTicketAddUser(interaction); } catch (e) { /* ignore */ }
    try { await handleTicketRemoveUser(interaction); } catch (e) { /* ignore */ }
    try { await handleTicketPriority(interaction); } catch (e) { /* ignore */ }
    try { await handleTicketRename(interaction); } catch (e) { /* ignore */ }
    try { await handleTicketAlert(interaction); } catch (e) { /* ignore */ }
    try { await handleTicketStats(interaction); } catch (e) { /* ignore */ }
  }
  
  // Select menu za help (ako je implementiran)
  if (interaction.isStringSelectMenu()) {
    // Dodaj custom select menu handlers ovde
  }
});
export async function handleGiveawayJoin(interaction) {
  if (!interaction.customId.startsWith('giveaway_join_')) return;

  const giveawayId = interaction.customId.replace('giveaway_join_', '');
  const giveaways = await getGiveaways();

  if (!giveaways[giveawayId]) {
    return interaction.reply({ content: `${emoji('error')} Giveaway nije pronađen!`, ephemeral: true });
  }

  const giveaway = giveaways[giveawayId];

  if (giveaway.participants.includes(interaction.user.id)) {
    return interaction.reply({ content: `${emoji('warning')} Već si se prijavio/la!`, ephemeral: true });
  }

  giveaway.participants.push(interaction.user.id);
  await saveGiveaways(giveaways);

  const embed = new EmbedBuilder()
    .setColor(0x2ECC71)
    .setTitle(`${emoji('success')} Prijavio se!`)
    .setDescription(`Sada si u giveaway-ju! 🎉`)
    .setTimestamp();

  return interaction.reply({ embeds: [embed], ephemeral: true });
}

// Winner selection sa DM potvrdos
async function selectWinners(giveawayId, client) {
  try {
    const giveaways = await getGiveaways();

    if (!giveaways[giveawayId]) return;

    const giveaway = giveaways[giveawayId];

    if (giveaway.participants.length === 0) {
      giveaway.status = 'NO_WINNERS';
      await saveGiveaways(giveaways);
      return;
    }

    // Izaberi random pobednike
    const winners = [];
    const participants = [...giveaway.participants];

    for (let i = 0; i < giveaway.winnersCount && i < participants.length; i++) {
      const randomIndex = Math.floor(Math.random() * participants.length);
      const winner = participants[randomIndex];
      winners.push(winner);
      participants.splice(randomIndex, 1);
    }

    giveaway.winners = winners;
    giveaway.status = 'PENDING_CONFIRMATION';
    await saveGiveaways(giveaways);

    // Pošalji DM pobediniku sa potvrom za 10 sekundi
    for (const winnerId of winners) {
      try {
        const winner = await client.users.fetch(winnerId);

        const dmEmbed = new EmbedBuilder()
          .setColor(0xFFD700)
          .setTitle(`${emoji('trophy')} ČESTITAM! Pobedio si!`)
          .setDescription(`**Nagrada:** ${giveaway.prize}`)
          .addFields(
            { name: `${emoji('warning')} VAŽNO`, value: 'Odgovori sa **YES** u roku od **10 sekundi** da potvrdis pobjedu!', inline: false }
          )
          .setTimestamp();

        const dmMsg = await winner.send({ embeds: [dmEmbed] });

        // Čekaj potvrdu 10 sekundi - bilo koja poruka
        const filter = m => m.author.id === winnerId;
        const confirmCollector = dmMsg.channel.createMessageCollector({ filter, max: 1, time: 10000 });

        confirmCollector.on('collect', async (msg) => {
          // Pobednik je odgovorio sa bilo čom porukom
          const confirmEmbed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle(`${emoji('success')} Nagrada Potvrđena!`)
            .setDescription(`Čestitamo! Nagrada će ti biti poslata uskoro!`)
            .setTimestamp();

          await winner.send({ embeds: [confirmEmbed] });

          giveaway.status = 'FINISHED';
          await saveGiveaways(giveaways);
        });

        confirmCollector.on('end', async (collected) => {
          if (collected.size === 0) {
            // Pobednik nije odgovorio - reroll
            const rerollEmbed = new EmbedBuilder()
              .setColor(0xE74C3C)
              .setTitle(`${emoji('warning')} Vreme je isteklo!`)
              .setDescription(`Niste potvrdili pobjedu u vremenu. Reroll je izvršen!`)
              .setTimestamp();

            await winner.send({ embeds: [rerollEmbed] });

            // Ponovo izaberi pobjednika
            const eligibleParticipants = giveaway.participants.filter(
              p => !winners.includes(p)
            );

            if (eligibleParticipants.length > 0) {
              const newWinner = eligibleParticipants[Math.floor(Math.random() * eligibleParticipants.length)];
              winners[winners.indexOf(winnerId)] = newWinner;

              // Pošalji novi DM novom pobjedniku
              const newWinnerUser = await client.users.fetch(newWinner);
              await newWinnerUser.send({ embeds: [dmEmbed] });
            } else {
              giveaway.status = 'NO_ELIGIBLE_WINNERS';
            }

            giveaway.winners = winners;
            await saveGiveaways(giveaways);
          }
        });
      } catch (e) {
        console.error('DM send error:', e);
      }
    }
  } catch (e) {
    console.error('Select winners error:', e);
  }
}

export { selectWinners };

// Load commands
await loadCommands();

// Login
client.login(process.env.DISCORD_TOKEN);
