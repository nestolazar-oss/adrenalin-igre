// commands/games/word.js
import { AttachmentBuilder, EmbedBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import srDict from 'dictionary-sr-latn';
import { emoji } from '../../utils/emojis.js';
import {
  generateWordRoundImage,
  generateWordVictoryImage
} from './word-canvas.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========== GAME STATE ==========
const gameStates = new Map();
const leaderboards = new Map();
const playerStats = new Map();
let WORD_DATABASE = { easy: [], medium: [], hard: [] };

// ========== CONFIG / PATHS ==========
const LEADERBOARD_DIR = path.join(__dirname, '../../data');
const LEADERBOARD_FILE = path.join(LEADERBOARD_DIR, 'word_game.json');
const PLAYER_STATS_FILE = path.join(LEADERBOARD_DIR, 'word_stats.json');

const GAME_CHANNELS = {
  easy: { envVar: 'WORD_GAME_CHANNEL_EASY', difficulty: 'easy', name: 'Lako', timeLimit: 120 },
  medium: { envVar: 'WORD_GAME_CHANNEL_MEDIUM', difficulty: 'medium', name: 'Srednje', timeLimit: 180 },
  hard: { envVar: 'WORD_GAME_CHANNEL_HARD', difficulty: 'hard', name: 'Tesko', timeLimit: 240 },
};

const ROUND_INTERVAL = 30 * 60 * 1000;

// ========== STOPWORDS ==========
const RAW_STOPWORDS = [
  'ali','ili','niti','jer','ako','mada','tek','premda','iako','da','se','ja','ti','on','ona','ono','mi','vi','oni','one',
  'me','te','nas','vas','mu','joj','jesam','jesi','jeste','je','smo','ste','su','sam','biti','bih','bi','bismo','biste',
  'hocu','hoces','hoce','hocemo','hocete','hteo','htela','za','od','u','na','iz','sa','kod','bez','kroz','pred','pri','po','do',
  'pored','ispod','iznad','iza','ispred','pokraj','usred','nasuprot','a','ne','to','sto','sta','gde','gdje','kada','kad',
  'kako','koga','kog','zasto','nije','nisu','nismo','niste','nisam','nisi','ovaj','taj','onaj','ovo','ono','ova','ta','ona',
  'koji','koja','koje','kojeg','kojoj','kojim','kojih','koliko','koliki','kolika','kolike'
];
const STOPWORDS = new Set(RAW_STOPWORDS.map(normalizeForCompare));

// ========== SUFFIXES ==========
const DERIVATIONAL_SUFFIXES = ['ica','čka','čić','čak','čko','ina','ara'];

// ========== UTILITIES ==========
async function ensureDir() {
  try { await fs.mkdir(LEADERBOARD_DIR, { recursive: true }); } catch (e) {}
}

async function loadLeaderboards() {
  try {
    await ensureDir();
    const data = await fs.readFile(LEADERBOARD_FILE, 'utf8').catch(() => null);
    if (!data) return;

    const json = JSON.parse(data);
    for (const [guildId, channels] of Object.entries(json)) {
      if (!leaderboards.has(guildId)) leaderboards.set(guildId, new Map());
      const guildLb = leaderboards.get(guildId);
      for (const [channelId, users] of Object.entries(channels)) {
        const userMap = new Map();
        for (const [userId, stats] of Object.entries(users)) {
          userMap.set(userId, {
            wins: stats.wins || 0,
            fastestTime: stats.fastestTime || Infinity,
            attempts: stats.attempts || 0,
            totalTime: stats.totalTime || 0
          });
        }
        guildLb.set(channelId, userMap);
      }
    }
    console.log('📖 Word Game: Leaderboard ucitan');
  } catch (e) { console.error('Load error:', e.message); }
}

async function loadPlayerStats() {
  try {
    await ensureDir();
    const data = await fs.readFile(PLAYER_STATS_FILE, 'utf8').catch(() => null);
    if (!data) return;

    const json = JSON.parse(data);
    for (const [userId, stats] of Object.entries(json)) {
      playerStats.set(userId, stats);
    }
    console.log('📖 Word Game: Player stats ucitani');
  } catch (e) { console.error('Stats load error:', e.message); }
}

async function saveLeaderboards() {
  try {
    await ensureDir();
    const data = {};
    for (const [guildId, channels] of leaderboards.entries()) {
      data[guildId] = {};
      for (const [channelId, userMap] of channels.entries()) {
        data[guildId][channelId] = {};
        for (const [userId, stats] of userMap.entries()) {
          data[guildId][channelId][userId] = stats;
        }
      }
    }
    await fs.writeFile(LEADERBOARD_FILE, JSON.stringify(data, null, 2));
  } catch (e) { console.error('Save error:', e.message); }
}

async function savePlayerStats() {
  try {
    await ensureDir();
    const data = Object.fromEntries(playerStats);
    await fs.writeFile(PLAYER_STATS_FILE, JSON.stringify(data, null, 2));
  } catch (e) { console.error('Stats save error:', e.message); }
}

function findChannelConfig(channelId) {
  for (const config of Object.values(GAME_CHANNELS)) {
    if (process.env[config.envVar] === channelId) return config;
  }
  return null;
}

function clearAllTimers(guildId, channelId) {
  try {
    const guildGames = gameStates.get(guildId);
    if (guildGames?.get(channelId)?.timeouts) {
      guildGames.get(channelId).timeouts.forEach(t => clearTimeout(t));
      guildGames.get(channelId).timeouts = [];
    }
  } catch (e) { console.error('Clear timers error:', e); }
}

// ========== NORMALIZATION ==========
function normalizeForCompare(text) {
  if (!text) return '';
  return text.toLowerCase()
    .replace(/dž/g, 'dz').replace(/đ/g, 'dj').replace(/[čć]/g, 'c')
    .replace(/ž/g, 'z').replace(/š/g, 's').replace(/[^a-z]/g, '');
}

function isValidGuess(text) {
  if (typeof text !== 'string') return false;
  const words = text.trim().split(/\s+/);
  if (words.length > 2) return false;
  const raw = words.join('');
  if (!/^[a-zčćžšđ]+$/i.test(raw)) return false;
  if (raw.length < 3) return false;
  const normalized = normalizeForCompare(raw);
  if (!normalized || normalized.length < 3) return false;
  if (STOPWORDS.has(normalized)) return false;
  return normalized;
}

// ========== GAME HANDLER ==========
export async function handleWordGame(message) {
  try {
    if (message.author.bot) return;

    const guildId = message.guildId;
    const channelId = message.channelId;
    const config = findChannelConfig(channelId);
    if (!config) return;

    const guildGames = gameStates.get(guildId);
    if (!guildGames) return;

    const state = guildGames.get(channelId);
    if (!state || !state.isActive) return;

    const guess = isValidGuess(message.content);
    if (!guess) return;

    if (guess === state.wordNormalized) {
      state.isActive = false;
      clearAllTimers(guildId, channelId);

      const duration = Math.floor((Date.now() - state.startTime) / 1000);

      updateLeaderboard(guildId, channelId, message.author.id, duration);
      updatePlayerStats(message.author.id, duration, config.difficulty);
      await saveLeaderboards();
      await savePlayerStats();

      const avatarUrl = message.author.displayAvatarURL?.({ format: 'png', size: 256 });

      let imageBuffer = null;
      try {
        imageBuffer = await generateWordVictoryImage(
          message.author.username,
          duration,
          avatarUrl,
          state.word,
          config.name
        );
      } catch (err) {
        console.error('Victory canvas error:', err);
        imageBuffer = null;
      }

      if (imageBuffer) {
        const attachment = new AttachmentBuilder(imageBuffer, { name: 'victory.png' });
        await message.reply({ files: [attachment] }).catch(() => {});
      } else {
        await message.reply(`${emoji('trophy')} <@${message.author.id}> je pogodio/la reč: **${state.word}** (${duration}s)`).catch(() => {});
      }
    } else {
      message.react('❌').catch(() => {});
    }
  } catch (e) {
    console.error('handleWordGame error:', e);
  }
}

// ========== LEADERBOARD & STATS ==========
function updateLeaderboard(guildId, channelId, userId, duration) {
  if (!leaderboards.has(guildId)) leaderboards.set(guildId, new Map());
  const guildLb = leaderboards.get(guildId);

  if (!guildLb.has(channelId)) guildLb.set(channelId, new Map());
  const channelLb = guildLb.get(channelId);

  const stats = channelLb.get(userId) || { wins: 0, fastestTime: Infinity, attempts: 0, totalTime: 0 };
  stats.wins++;
  stats.fastestTime = Math.min(stats.fastestTime, duration);
  stats.attempts++;
  stats.totalTime += duration;

  channelLb.set(userId, stats);
}

function updatePlayerStats(userId, duration, difficulty) {
  const stats = playerStats.get(userId) || { totalWins: 0, totalTime: 0, avgTime: 0, bestTime: Infinity, difficulties: {} };
  stats.totalWins++;
  stats.totalTime += duration;
  stats.avgTime = Math.round(stats.totalTime / stats.totalWins);
  stats.bestTime = Math.min(stats.bestTime, duration);

  if (!stats.difficulties[difficulty]) {
    stats.difficulties[difficulty] = { wins: 0, bestTime: Infinity };
  }
  stats.difficulties[difficulty].wins++;
  stats.difficulties[difficulty].bestTime = Math.min(stats.difficulties[difficulty].bestTime, duration);

  playerStats.set(userId, stats);
}

// ========== WORD VALIDATION ==========
function isValidGameWord(word, allWordsSet) {
  if (!word || word.length < 3 || word.length > 15) return false;
  if (!/^[a-zčćžšđ]+$/i.test(word)) return false;

  const normalized = word.toLowerCase();

  for (const suffix of DERIVATIONAL_SUFFIXES) {
    if (normalized.endsWith(suffix) && normalized.length > suffix.length + 2) {
      const baseForm = normalized.slice(0, -suffix.length);

      if (allWordsSet.has(baseForm)) {
        if ((suffix === 'čko' || suffix === 'čka') && baseForm.length <= 4) {
          return true;
        }
        return false;
      }
    }
  }

  return true;
}

// ========== INITIALIZE DATABASE ==========
async function initializeWordDatabaseWithFiltering() {
  try {
    const dicBuffer = srDict.dic;
    const dicText = dicBuffer.toString('utf8');
    const lines = dicText.split('\n').map(l => l.trim()).filter(Boolean);

    const wordLines = lines.slice(1);
    const allWordsSet = new Set(wordLines.map(w => w.toLowerCase()));

    console.log(`📚 Učitavam ${wordLines.length} reči iz Hunspell rečnika...`);

    const allWords = [];
    let rejected = { derived: 0, shortlong: 0, invalid: 0, stopwords: 0 };

    for (const word of wordLines) {
      const normalized = word.toLowerCase();

      if (!normalized || normalized.length < 3 || normalized.length > 15) {
        rejected.shortlong++;
        continue;
      }
      if (!/^[a-zčćžšđ]+$/.test(normalized)) {
        rejected.invalid++;
        continue;
      }

      if (STOPWORDS.has(normalizeForCompare(normalized))) {
        rejected.stopwords++;
        continue;
      }

      if (!isValidGameWord(normalized, allWordsSet)) {
        rejected.derived++;
        continue;
      }

      allWords.push(normalized);
    }

    console.log(`✅ Validnih reči: ${allWords.length}`);

    if (allWords.length === 0) {
      throw new Error('Nema validnih reči nakon filtriranja');
    }

    const db = { easy: [], medium: [], hard: [] };
    allWords.forEach(w => {
      const len = w.length;
      if (len <= 5) db.easy.push(w);
      else if (len <= 8) db.medium.push(w);
      else db.hard.push(w);
    });

    WORD_DATABASE = db;
    console.log('✅ Rečnik učitan:', { easy: WORD_DATABASE.easy.length, medium: WORD_DATABASE.medium.length, hard: WORD_DATABASE.hard.length });
  } catch (e) {
    console.error('❌ Greška pri učitavanju rečnika:', e.message);
    WORD_DATABASE = {
      easy: ['macka', 'pas', 'kuca', 'voda', 'nebo', 'sunce', 'mesec', 'boja', 'hleb', 'pica', 'stol', 'vrata', 'prozor'],
      medium: ['zgrada', 'gradina', 'stablo', 'lisce', 'cvet', 'ptica', 'automobil', 'gitara', 'musica', 'knjiga'],
      hard: ['planina', 'telefon', 'raspored', 'temperatura', 'elektriciteta', 'univerzitet']
    };
  }
}

// ========== SCHEDULER ==========
export function startWordGameScheduler(client) {
  initializeWordDatabaseWithFiltering().then(async () => {
    await loadLeaderboards().catch(console.error);
    await loadPlayerStats().catch(console.error);

    const availableChannels = [];
    for (const config of Object.values(GAME_CHANNELS)) {
      const channelId = process.env[config.envVar];
      if (!channelId) continue;

      const gameChannel = client.channels.cache.get(channelId);
      if (!gameChannel) continue;
      availableChannels.push({ config, gameChannel });
    }

    if (availableChannels.length === 0) {
      console.warn('⚠️ Word Game: Nema dostupnih game channels!');
      return;
    }

    const startRandomRound = async () => {
      try {
        const selected = availableChannels[Math.floor(Math.random() * availableChannels.length)];
        const { config, gameChannel } = selected;

        const guildId = gameChannel.guildId;
        const channelId = gameChannel.id;
        if (!gameStates.has(guildId)) gameStates.set(guildId, new Map());
        const guildGames = gameStates.get(guildId);

        clearAllTimers(guildId, channelId);

        const wordList = WORD_DATABASE[config.difficulty] || [];
        if (!wordList.length) return;

        const word = wordList[Math.floor(Math.random() * wordList.length)];

        const state = {
          channel: gameChannel,
          word,
          wordNormalized: normalizeForCompare(word),
          isActive: true,
          startTime: Date.now(),
          timeouts: [],
          attempts: 0,
          difficulty: config.difficulty,
          seconds: config.timeLimit
        };
        guildGames.set(channelId, state);

        const wordLength = word.length;

        try {
          const imageBuffer = await generateWordRoundImage(
            word,
            wordLength,
            config.timeLimit,
            config.name.toUpperCase()
          );
          if (imageBuffer) {
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'runda.png' });
            await gameChannel.send({ files: [attachment] }).catch(() => {});
          } else {
            throw new Error('No image buffer returned');
          }
        } catch (err) {
          const embed = new EmbedBuilder()
            .setColor(config.difficulty === 'easy' ? 0x00FF88 : config.difficulty === 'medium' ? 0xFFD700 : 0xFF4444)
            .setTitle(`${emoji('chat')} NOVA RUNDA - ${config.name.toUpperCase()}`)
            .setDescription(`**Reč: ${word.toUpperCase()}**\n\nImaš **${config.timeLimit} sekundi**!\n\n📏 **${wordLength} slova**`)
            .setFooter({ text: 'discord.gg/adrenalin' })
            .setTimestamp();

          await gameChannel.send({ embeds: [embed] }).catch(() => {});
          console.error('Round canvas error:', err);
        }

        const resetTimeout = setTimeout(async () => {
          if (state.isActive) {
            state.isActive = false;
            clearAllTimers(guildId, channelId);

            const timeoutEmbed = new EmbedBuilder()
              .setColor(0xFF4444)
              .setTitle('⏰ VREME ISTEKLO!')
              .setDescription(`Niko nije pogodio!\n\n🎯 **Reč je bila: ${state.word.toUpperCase()}**`)
              .setFooter({ text: 'Sledeca runda za 30 minuta!' })
              .setTimestamp();

            await gameChannel.send({ embeds: [timeoutEmbed] }).catch(() => {});
          }
        }, config.timeLimit * 1000);

        state.timeouts.push(resetTimeout);
      } catch (e) {
        console.error('startRandomRound error:', e);
      }
    };

    startRandomRound();
    setInterval(startRandomRound, ROUND_INTERVAL);
    console.log('📖 Word Game Scheduler started!');
  });
}

// ========== COMMAND EXECUTOR ==========
export const meta = {
  name: 'wordgame',
  aliases: ['wg', 'rec'],
  description: 'Word Game - pogodi reč'
};

export async function execute(message, args) {
  const subcommand = args[0]?.toLowerCase();

  if (subcommand === 'start') {
    const availableChannels = [];
    for (const config of Object.values(GAME_CHANNELS)) {
      const channelId = process.env[config.envVar];
      if (!channelId) continue;
      const gameChannel = message.client.channels.cache.get(channelId);
      if (!gameChannel) continue;
      availableChannels.push({ config, gameChannel });
    }

    if (availableChannels.length === 0) {
      return message.reply(`${emoji('error')} Nema dostupnih game channels!`);
    }

    const selected = availableChannels[Math.floor(Math.random() * availableChannels.length)];
    const { config, gameChannel } = selected;

    const guildId = gameChannel.guildId;
    const channelId = gameChannel.id;
    if (!gameStates.has(guildId)) gameStates.set(guildId, new Map());
    const guildGames = gameStates.get(guildId);

    clearAllTimers(guildId, channelId);

    const wordList = WORD_DATABASE[config.difficulty] || [];
    if (!wordList.length) return message.reply(`${emoji('error')} Nema dostupnih reči!`);

    const word = wordList[Math.floor(Math.random() * wordList.length)];
    const state = {
      channel: gameChannel,
      word,
      wordNormalized: normalizeForCompare(word),
      isActive: true,
      startTime: Date.now(),
      timeouts: [],
      attempts: 0,
      difficulty: config.difficulty,
      seconds: config.timeLimit
    };
    guildGames.set(channelId, state);

    const wordLength = word.length;

    try {
      const imageBuffer = await generateWordRoundImage(
        word,
        wordLength,
        config.timeLimit,
        config.name.toUpperCase()
      );
      if (imageBuffer) {
        const attachment = new AttachmentBuilder(imageBuffer, { name: 'runda.png' });
        await gameChannel.send({ files: [attachment] }).catch(() => {});
      } else {
        throw new Error('No image buffer returned');
      }
    } catch (err) {
      const embed = new EmbedBuilder()
        .setColor(config.difficulty === 'easy' ? 0x00FF88 : config.difficulty === 'medium' ? 0xFFD700 : 0xFF4444)
        .setTitle(`${emoji('chat')} NOVA RUNDA - ${config.name.toUpperCase()}`)
        .setDescription(`**Reč: ${word.toUpperCase()}**\n\nImaš **${config.timeLimit} sekundi**!`)
        .setFooter({ text: 'discord.gg/adrenalin' })
        .setTimestamp();

      await gameChannel.send({ embeds: [embed] }).catch(() => {});
      console.error('Round canvas error (manual start):', err);
    }

    const resetTimeout = setTimeout(async () => {
      if (state.isActive) {
        state.isActive = false;
        clearAllTimers(guildId, channelId);

        const timeoutEmbed = new EmbedBuilder()
          .setColor(0xFF4444)
          .setTitle('⏰ VREME ISTEKLO!')
          .setDescription(`Niko nije pogodio!\n\n🎯 **Reč je bila: ${state.word.toUpperCase()}**`)
          .setFooter({ text: 'Sledeca runda za 30 minuta!' })
          .setTimestamp();

        await gameChannel.send({ embeds: [timeoutEmbed] }).catch(() => {});
      }
    }, config.timeLimit * 1000);

    state.timeouts.push(resetTimeout);

    const confirmEmbed = new EmbedBuilder()
      .setColor(0x00FF88)
      .setTitle('✅ Word Game runda pokrenuta!')
      .setDescription(`Igra je pokrenuta u <#${channelId}>\nReč: **${word.toUpperCase()}** (${wordLength} slova)\nTežina: **${config.name}**`);

    return message.reply({ embeds: [confirmEmbed] });
  }

  if (subcommand === 'leaderboard' || subcommand === 'lb') {
    const guildId = message.guildId;
    const guildLb = leaderboards.get(guildId);
    if (!guildLb || guildLb.size === 0) return message.reply('Nema leaderboarda.');

    const allStats = new Map();
    for (const [channelId, userMap] of guildLb.entries()) {
      for (const [userId, stats] of userMap.entries()) {
        if (!allStats.has(userId)) allStats.set(userId, { wins: 0, fastestTime: Infinity, totalTime: 0 });
        const combined = allStats.get(userId);
        combined.wins += stats.wins || 0;
        combined.fastestTime = Math.min(combined.fastestTime, stats.fastestTime || Infinity);
        combined.totalTime += stats.totalTime || 0;
      }
    }

    const sorted = Array.from(allStats.entries()).sort((a, b) => b[1].wins - a[1].wins).slice(0, 10);
    const lines = sorted.map((e, i) => {
      const wins = e[1].wins || 0;
      const fastest = (e[1].fastestTime === Infinity || !isFinite(e[1].fastestTime)) ? 'N/A' : `${e[1].fastestTime}s`;
      const avg = wins ? Math.round(e[1].totalTime / wins) : 0;
      return `${i + 1}. <@${e[0]}> - ${emoji('trophy')} **${wins}** | ⚡ **${fastest}** | ⏱️ **${avg}s**`;
    });

    const embed = new EmbedBuilder()
      .setColor(0x00A8FF)
      .setTitle('📖 Word Game Leaderboard')
      .setDescription(lines.join('\n'));

    return message.reply({ embeds: [embed] });
  }

  if (subcommand === 'stats' || subcommand === 'profile') {
    const userId = message.mentions.users.first()?.id || message.author.id;
    const stats = playerStats.get(userId) || { totalWins: 0, avgTime: 0, bestTime: Infinity, difficulties: {} };
    const diffLines = Object.entries(stats.difficulties || {}).map(([diff, data]) => `> **${diff}:** ${emoji('trophy')} ${data.wins} | ⚡ ${data.bestTime}s`).join('\n') || 'Nema podataka.';

    const embed = new EmbedBuilder()
      .setColor(0x00A8FF)
      .setTitle('📊 Statistika')
      .setDescription(`<@${userId}>\n\n${emoji('trophy')} **Pobeda:** ${stats.totalWins || 0}\n⏱️ **Prosek:** ${stats.avgTime || 0}s\n⚡ **Najbolje:** ${stats.bestTime === Infinity ? 'N/A' : stats.bestTime + 's'}\n\n${diffLines}`);

    return message.reply({ embeds: [embed] });
  }

  const helpEmbed = new EmbedBuilder()
    .setColor(0x00A8FF)
    .setTitle('📖 Word Game')
    .setDescription(`Igra se automatski svakih 30 minuta!\n\n\`-wg start\` - Pokreni rundu\n\`-wg lb\` - Leaderboard\n\`-wg stats\` - Statistika`);

  return message.reply({ embeds: [helpEmbed] });
}

export default { meta, execute, handleWordGame, startWordGameScheduler };