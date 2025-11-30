import { EmbedBuilder } from 'discord.js';
import { initUser, updateUser } from '../../utils/db.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const meta = {
  name: 'guess',
  aliases: ['g', 'pogodi'],
  description: 'Pogodi broj - Auto igra svakih 30 minuta'
};

// Game state
const gameStates = new Map(); // channelId -> state
const leaderboards = new Map(); // channelId -> Map<userId, stats>

// Config
const LEADERBOARD_DIR = path.join(__dirname, '../../data');
const LEADERBOARD_FILE = path.join(LEADERBOARD_DIR, 'guess_leaderboard.json');

const GAME_CHANNELS = {
  easy: { range: [1, 100], reward: 100, name: 'Lako' },
  medium: { range: [1, 1000], reward: 250, name: 'Srednje' }
};

const ROUND_INTERVAL = 30 * 60 * 1000; // 30 minuta
const GAME_TIMEOUT = 10 * 60 * 1000; // 10 minuta

// ========== PERSISTENCE ==========
async function ensureDir() {
  try {
    await fs.mkdir(LEADERBOARD_DIR, { recursive: true });
  } catch (e) {}
}

async function loadLeaderboards() {
  try {
    await ensureDir();
    const data = await fs.readFile(LEADERBOARD_FILE, 'utf8').catch(() => null);
    if (!data) return;

    const json = JSON.parse(data);
    for (const [channelId, users] of Object.entries(json)) {
      const userMap = new Map();
      for (const [userId, stats] of Object.entries(users)) {
        userMap.set(userId, stats);
      }
      leaderboards.set(channelId, userMap);
    }
    console.log('📊 Guess Game: Leaderboard učitan');
  } catch (e) {
    console.error('Guess load error:', e.message);
  }
}

async function saveLeaderboards() {
  try {
    await ensureDir();
    const data = {};
    for (const [channelId, userMap] of leaderboards.entries()) {
      data[channelId] = Object.fromEntries(userMap);
    }
    await fs.writeFile(LEADERBOARD_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Guess save error:', e.message);
  }
}

// ========== GAME LOGIC ==========
function updateLeaderboard(channelId, userId, attempts, duration) {
  if (!leaderboards.has(channelId)) {
    leaderboards.set(channelId, new Map());
  }
  
  const lb = leaderboards.get(channelId);
  const stats = lb.get(userId) || { wins: 0, totalAttempts: 0, fastestTime: Infinity };
  
  stats.wins++;
  stats.totalAttempts += attempts;
  stats.fastestTime = Math.min(stats.fastestTime, duration);
  
  lb.set(userId, stats);
}

export async function handleGuessGame(message) {
  if (message.author.bot) return;

  const channelId = message.channelId;
  const state = gameStates.get(channelId);
  
  if (!state || !state.isActive) return;

  const numberMatch = message.content.trim().match(/^\d+$/);
  if (!numberMatch) return;

  const guess = parseInt(numberMatch[0], 10);
  const [min, max] = state.range;
  
  if (guess < min || guess > max) return;

  state.attempts++;

  // POGODAK
  if (guess === state.currentNumber) {
    state.isActive = false;
    clearTimeout(state.timeout);

    const duration = Math.floor((Date.now() - state.startTime) / 1000);
    
    // Nagradi igrača
    const user = initUser(message.author.id);
    user.cash += state.reward;
    updateUser(message.author.id, user);

    updateLeaderboard(channelId, message.author.id, state.attempts, duration);
    await saveLeaderboards();

    const victoryEmbed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle('🎉 BRAVO!')
      .setDescription(`**<@${message.author.id}> je pogodio broj ${state.currentNumber}!**\n\n⏱️ Trajanje: **${duration}s**\n🎯 Pokušaji: **${state.attempts}**\n💰 Nagrada: **$${state.reward}**\n\n📢 Sledeća runda za **30 minuta**`)
      .setTimestamp();

    await message.reply({ embeds: [victoryEmbed] });
  } else {
    // Hint
    const hint = guess < state.currentNumber ? '📈 Broj je VEĆI!' : '📉 Broj je MANJI!';
    await message.react(guess < state.currentNumber ? '⬆️' : '⬇️').catch(() => {});
  }
}

// ========== AUTO SCHEDULER ==========
export function startGuessGameScheduler(client) {
  loadLeaderboards();

  const channels = [
    { id: process.env.GUESS_CHANNEL_EASY, config: GAME_CHANNELS.easy },
    { id: process.env.GUESS_CHANNEL_MEDIUM, config: GAME_CHANNELS.medium }
  ];

  for (const { id, config } of channels) {
    if (!id) continue;

    const channel = client.channels.cache.get(id);
    if (!channel) continue;

    const startRound = async () => {
      const [min, max] = config.range;
      const number = Math.floor(Math.random() * (max - min + 1)) + min;

      const state = {
        currentNumber: number,
        isActive: true,
        attempts: 0,
        startTime: Date.now(),
        range: config.range,
        reward: config.reward,
        timeout: null
      };

      gameStates.set(channel.id, state);

      const startEmbed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle(`🎲 Nova Runda - ${config.name}`)
        .setDescription(`**Pogodite broj između ${min} i ${max}!**\n\n💰 Nagrada: **$${config.reward}**\n⏱️ Vreme: **10 minuta**`)
        .setTimestamp();

      await channel.send({ embeds: [startEmbed] });

      state.timeout = setTimeout(async () => {
        if (state.isActive) {
          state.isActive = false;

          const timeoutEmbed = new EmbedBuilder()
            .setColor(0xE74C3C)
            .setTitle('⏰ Vreme Isteklo')
            .setDescription(`Niko nije pogodio!\n\n🎯 Broj je bio: **${number}**`);

          await channel.send({ embeds: [timeoutEmbed] });
        }
      }, GAME_TIMEOUT);
    };

    startRound();
    setInterval(startRound, ROUND_INTERVAL);
  }

  console.log('🎲 Guess Game Scheduler started!');
}

// ========== COMMAND ==========
export async function execute(message, args) {
  const subcommand = args[0]?.toLowerCase();

  if (subcommand === 'start') {
    // Svi mogu start - bez provere dozvola
    
    const available = [];
    for (const cfg of Object.values(GAME_CHANNELS)) {
      if (!cfg) continue;
      available.push(cfg);
    }

    if (available.length === 0) {
      return message.reply('❌ Nema dostupnih game kanala!');
    }

    const selected = available[Math.floor(Math.random() * available.length)];
    const channelId = message.channelId;
    
    // Proveri da li je već igra aktivna u kanalu
    const existingState = gameStates.get(channelId);
    if (existingState?.isActive) {
      return message.reply('❌ Igra je već aktivna u ovom kanalu!');
    }

    const [min, max] = selected.range;
    const number = Math.floor(Math.random() * (max - min + 1)) + min;

    const state = {
      currentNumber: number,
      isActive: true,
      attempts: 0,
      startTime: Date.now(),
      range: selected.range,
      reward: selected.reward,
      timeout: null
    };

    gameStates.set(channelId, state);

    const startEmbed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle(`🎲 Nova Runda - ${selected.name}`)
      .setDescription(`**Pogodite broj između ${min} i ${max}!**\n\n💰 Nagrada: **$${selected.reward}**\n⏱️ Vreme: **10 minuta**`)
      .setTimestamp();

    await message.channel.send({ embeds: [startEmbed] });

    state.timeout = setTimeout(async () => {
      if (state.isActive) {
        state.isActive = false;

        const timeoutEmbed = new EmbedBuilder()
          .setColor(0xE74C3C)
          .setTitle('⏰ Vreme Isteklo')
          .setDescription(`Niko nije pogodio!\n\n🎯 Broj je bio: **${number}**`);

        await message.channel.send({ embeds: [timeoutEmbed] });
      }
    }, 10 * 60 * 1000);

    return;
  }

  if (subcommand === 'lb' || subcommand === 'leaderboard') {
    const channelId = message.channelId;
    const lb = leaderboards.get(channelId);

    if (!lb || lb.size === 0) {
      return message.reply('📊 Nema podataka na leaderboardu!');
    }

    const sorted = Array.from(lb.entries())
      .sort((a, b) => b[1].wins - a[1].wins)
      .slice(0, 10);

    const lines = sorted.map((e, i) => {
      const avg = Math.round(e[1].totalAttempts / e[1].wins);
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      return `${medal} <@${e[0]}> - 🏆 **${e[1].wins}** | ⚡ **${e[1].fastestTime}s** | 📊 **${avg}** pokušaja`;
    });

    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('🏆 Guess Game Leaderboard')
      .setDescription(lines.join('\n'));

    return message.reply({ embeds: [embed] });
  }

  const helpEmbed = new EmbedBuilder()
    .setColor(0x2596BE)
    .setTitle('🎲 Guess Game')
    .setDescription('Igra se automatski svakih 30 minuta!\n\n`-guess start` - Pokreni rundu\n`-guess lb` - Leaderboard');

  return message.reply({ embeds: [helpEmbed] });
}

export default { meta, execute, handleGuessGame, startGuessGameScheduler };