import { AttachmentBuilder, EmbedBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas } from 'canvas';
import srDict from 'dictionary-sr-latn';
import fetch from 'node-fetch';

// ========== WORD GAME ==========
export const meta = {
  name: 'wordgame',
  aliases: ['wg', 'recrunda', 'rec'],
  description: 'Word Game - pogdi reč koja je vidljiva'
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========== GAME STATE ==========
const gameStates = new Map();
const leaderboards = new Map();
const playerStats = new Map();
let WORD_DATABASE = { easy: [], medium: [], hard: [] };

// ========== CONFIG / PATHS ==========
const LEADERBOARD_DIR = path.join(__dirname, '..', '..', 'data');
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
  try { await fs.mkdir(LEADERBOARD_DIR, { recursive: true }); } 
  catch (e) {}
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

// ========== AVATAR LOADER ==========
async function loadAvatarImage(url) {
  try {
    const pngUrl = url.replace(/\?size=\d+/, '').replace(/\.webp/, '.png');
    const finalUrl = pngUrl.includes('?') ? pngUrl : pngUrl + '?size=256';
    const res = await fetch(finalUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const { loadImage } = await import('canvas');
    const img = await loadImage(buffer);
    return img;
  } catch (e) {
    console.error('Avatar load error:', e.message);
    return null;
  }
}

// ========== IMAGE GENERATOR ==========
async function generateVictoryImage(username, word, duration, difficulty, avatarUrl) {
  try {
    const width = 800;
    const height = 350;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#0a0e27');
    grad.addColorStop(0.5, '#1a1f4d');
    grad.addColorStop(1, '#0a0e27');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(0,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 2 + 0.5;
      ctx.fillRect(x, y, size, size);
    }

    const avatarX = 200;
    const avatarY = 175;
    const avatarRadius = 117;

    ctx.fillStyle = 'rgba(0,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarRadius + 40, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(100,200,255,0.08)';
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarRadius + 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#00FFFF';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#00FFFF';
    ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (avatarUrl) {
      try {
        const img = await loadAvatarImage(avatarUrl);
        if (img) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(avatarX, avatarY, avatarRadius - 5, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, avatarX - (avatarRadius - 5), avatarY - (avatarRadius - 5), (avatarRadius - 5) * 2, (avatarRadius - 5) * 2);
          ctx.restore();
        }
      } catch (e) {
        console.error('Avatar render error:', e.message);
      }
    }

    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 20;
    ctx.textAlign = 'left';

    let xText = 460;
    let yStart = 70;
    let lineGap = 90;

    ctx.font = 'bold 32px "Arial", sans-serif';
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText('POBEDNIK:', xText, yStart);

    ctx.font = 'bold 32px "Arial", sans-serif';
    ctx.fillStyle = '#00FFFF';
    ctx.shadowColor = 'rgba(0, 255, 255, 0.5)';
    ctx.shadowBlur = 15;
    ctx.fillText(username.toUpperCase(), xText, yStart + 35);
    ctx.shadowBlur = 0;

    yStart += lineGap;
    ctx.font = 'bold 32px "Arial", sans-serif';
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText('VREME:', xText, yStart);

    ctx.font = 'bold 32px "Arial", sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
    ctx.shadowBlur = 15;
    ctx.fillText(`${duration}s`, xText, yStart + 35);
    ctx.shadowBlur = 0;

    yStart += lineGap;
    ctx.font = 'bold 32px "Arial", sans-serif';
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText('REC:', xText, yStart);

    ctx.font = 'bold 32px "Arial", sans-serif';
    ctx.fillStyle = '#00FF88';
    ctx.shadowColor = 'rgba(0, 255, 136, 0.5)';
    ctx.shadowBlur = 15;
    ctx.fillText(word.toUpperCase(), xText, yStart + 35);
    ctx.shadowBlur = 0;

    ctx.font = '18px "Arial", sans-serif';
    ctx.fillStyle = '#888888';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.fillText('discord.gg/adrenalin', width / 2, height - 20);
    ctx.shadowBlur = 0;

    const badgeX = width - 80;
    const badgeY = 30;
    const diffColor = difficulty === 'easy' ? '#00FF88' : difficulty === 'medium' ? '#FFD700' : '#FF4444';
    const diffText = difficulty === 'easy' ? 'LAKO' : difficulty === 'medium' ? 'SREDNJE' : 'TESKO';

    ctx.fillStyle = `rgba(${difficulty === 'easy' ? '0,255,136' : difficulty === 'medium' ? '255,215,0' : '255,68,68'},0.15)`;
    ctx.fillRect(badgeX - 60, badgeY - 20, 120, 40);

    ctx.strokeStyle = diffColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(badgeX - 60, badgeY - 20, 120, 40);

    ctx.font = 'bold 16px "Arial", sans-serif';
    ctx.fillStyle = diffColor;
    ctx.textAlign = 'center';
    ctx.fillText(diffText, badgeX, badgeY + 5);

    return canvas.toBuffer('image/png');
  } catch (e) {
    console.error('Canvas error:', e);
    return null;
  }
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
      const imageBuffer = await generateVictoryImage(message.author.username, state.word, duration, config.difficulty, avatarUrl);

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
    console.log(`📊 Odbijeno: Derivirane: ${rejected.derived}, Stopwords: ${rejected.stopwords}, Kratke/duge: ${rejected.shortlong}, Nevaljane: ${rejected.invalid}`);

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
          difficulty: config.difficulty
        };
        guildGames.set(channelId, state);

        const wordLength = word.length;
        const newRoundEmbed = new EmbedBuilder()
          .setColor(config.difficulty === 'easy' ? 0x00FF88 : config.difficulty === 'medium' ? 0xFFD700 : 0xFF4444)
          .setTitle(`${emoji('chat')} NOVA RUNDA - ${config.name.toUpperCase()}`)
          .setDescription(`🎮 **POGDI REC!**\n\n**Reč: ${word.toUpperCase()}**\n\nImaš **${config.timeLimit} sekundi** da napišeš ovu reč!\n\n📏 Reč ima **${wordLength} slova**`)
          .addFields(
            { name: '📝 Upustva', value: 'Kucaj reč direktno u kanal. Ko brže pogodi - taj je pobednik!', inline: false },
            { name: `${emoji('clock')} Vreme`, value: `**${config.timeLimit}s**`, inline: true },
            { name: `${emoji('repeat')} Težina`, value: `**${config.name}**`, inline: true }
          )
          .setFooter({ text: 'discord.gg/adrenalin | Srecno!' })
          .setTimestamp();

        await gameChannel.send({ embeds: [newRoundEmbed] }).catch(() => {});

        const resetTimeout = setTimeout(async () => {
          if (state.isActive) {
            state.isActive = false;
            clearAllTimers(guildId, channelId);

            const timeoutEmbed = new EmbedBuilder()
              .setColor(0xFF4444)
              .setTitle('⏰ VREME ISTEKLO!')
              .setDescription(`Niko nije pogodio reč!\n\n🎯 **Reč je bila: ${state.word.toUpperCase()}**`)
              .addFields({ name: '📖 Odgovor', value: `**${state.word.toUpperCase()}**`, inline: false })
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
export async function execute(message, args, context) {
  const { OWNER_ID, PREFIX, isWhitelisted } = context;
  const subcommand = args[0]?.toLowerCase();
  const userAllowed = message.author.id === OWNER_ID || isWhitelisted(message.member);

  if (subcommand === 'start') {
    if (!userAllowed) return message.reply('Samo vlasnik ili whitelistovani mogu startovati igru.');

    const availableChannels = [];
    for (const config of Object.values(GAME_CHANNELS)) {
      const channelId = process.env[config.envVar];
      if (!channelId) continue;
      const gameChannel = message.client.channels.cache.get(channelId);
      if (!gameChannel) continue;
      availableChannels.push({ config, gameChannel });
    }

    if (availableChannels.length === 0) {
      return message.reply(`${emoji('error')} Nema dostupnih game channels! Provjeri .env varijable.`);
    }

    const selected = availableChannels[Math.floor(Math.random() * availableChannels.length)];
    const { config, gameChannel } = selected;

    const guildId = gameChannel.guildId;
    const channelId = gameChannel.id;
    if (!gameStates.has(guildId)) gameStates.set(guildId, new Map());
    const guildGames = gameStates.get(guildId);

    clearAllTimers(guildId, channelId);

    const wordList = WORD_DATABASE[config.difficulty] || [];
    if (!wordList.length) return message.reply(`${emoji('error')} Nema dostupnih reči za ovu težinu!`);

    const word = wordList[Math.floor(Math.random() * wordList.length)];
    const state = {
      channel: gameChannel,
      word,
      wordNormalized: normalizeForCompare(word),
      isActive: true,
      startTime: Date.now(),
      timeouts: [],
      attempts: 0,
      difficulty: config.difficulty
    };
    guildGames.set(channelId, state);

    // Build and send the embed for the round
    const wordLength = word.length;
    const newRoundEmbed = new EmbedBuilder()
      .setColor(config.difficulty === 'easy' ? 0x00FF88 : config.difficulty === 'medium' ? 0xFFD700 : 0xFF4444)
      .setTitle(`${CUSTOM_EMOJIES.rec ?? emoji('chat')} NOVA RUNDA - ${config.name.toUpperCase()}`)
      .setDescription(`🎮 **POGODI REC!**\n\n**Reč: ${word.toUpperCase()}**\n\nImaš **${config.timeLimit} sekundi** da napišeš ovu reč!\n\n📏 Reč ima **${wordLength} slova**`)
      .addFields(
        { name: '📝 Upustva', value: 'Kucaj reč direktno u kanal. Ko brže pogodi - taj je pobednik!', inline: false },
        { name: `${CUSTOM_EMOJIES.vreme} Vreme`, value: `**${config.timeLimit}s**`, inline: true },
        { name: `${CUSTOM_EMOJIES.fastest} Težina`, value: `**${config.name}**`, inline: true }
      )
      .setFooter({ text: 'discord.gg/adrenalin | Srecno!' })
      .setTimestamp();

    await gameChannel.send({ embeds: [newRoundEmbed] }).catch(() => {});

    // Set timeout for round expiration
    const resetTimeout = setTimeout(async () => {
      if (state.isActive) {
        state.isActive = false;
        clearAllTimers(guildId, channelId);

        const timeoutEmbed = new EmbedBuilder()
          .setColor(0xFF4444)
          .setTitle('⏰ VREME ISTEKLO!')
          .setDescription(`Niko nije pogodio reč!\n\n🎯 **Reč je bila: ${state.word.toUpperCase()}**`)
          .addFields({ name: '📖 Odgovor', value: `**${state.word.toUpperCase()}**`, inline: false })
          .setFooter({ text: 'Sledeca runda za 30 minuta!' })
          .setTimestamp();

        await gameChannel.send({ embeds: [timeoutEmbed] }).catch(() => {});
      }
    }, config.timeLimit * 1000);

    state.timeouts.push(resetTimeout);

    // Confirm to the command issuer (optional)
    const confirmEmbed = new EmbedBuilder()
      .setColor(0x00FF88)
      .setTitle('✅ Word Game runda pokrenuta!')
      .setDescription(`Igra je pokrenuta u <#${channelId}>\nReč: **${word.toUpperCase()}** (${wordLength} slova)\nTežina: **${config.name}**`);

    return message.reply({ embeds: [confirmEmbed] });
  } // end subcommand start

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
      return `${i + 1}. <@${e[0]}> - ${CUSTOM_EMOJIES.pobedu} **${wins}** | ${CUSTOM_EMOJIES.fastest} **${fastest}** | ${CUSTOM_EMOJIES.average} **${avg}s**`;
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
    const diffLines = Object.entries(stats.difficulties || {}).map(([diff, data]) => `> **${diff}:** ${CUSTOM_EMOJIES.pobedu} ${data.wins} | ${CUSTOM_EMOJIES.fastest} ${data.bestTime}s`).join('\n') || 'Nema podataka po tezini.';

    const embed = new EmbedBuilder()
      .setColor(0x00A8FF)
      .setTitle('📊 Statistika')
      .setDescription(`<@${userId}>\n\n${CUSTOM_EMOJIES.pobedu} **Ukupno pobeda:** ${stats.totalWins || 0}\n${CUSTOM_EMOJIES.average} **Prosečno vreme:** ${stats.avgTime || 0}s\n${CUSTOM_EMOJIES.fastest} **Najbolje vreme:** ${stats.bestTime === Infinity ? 'N/A' : stats.bestTime + 's'}\n\n${diffLines}`);

    return message.reply({ embeds: [embed] });
  }

  if (!userAllowed) return message.reply('Samo vlasnik ili whitelistovani mogu koristiti ovu komandu.');

  const helpEmbed = new EmbedBuilder()
    .setColor(0x00A8FF)
    .setTitle('📖 Word Game')
    .setDescription(
      `Igra se automatski svakih 30 minuta u game kanalima\n\n` +
      `\`${PREFIX}wg start\` - Pokreni rundu manuelno\n` +
      `\`${PREFIX}wg lb\` - Leaderboard\n` +
      `\`${PREFIX}wg stats\` - Tvoja statistika\n` +
      `\`${PREFIX}wg stats @korisnik\` - Statistika drugog korisnika`
    );

  return message.reply({ embeds: [helpEmbed] });
} // end execute()


// ========== SCHEDULER HELPERS (optional) ==========
/**
 * startRandomRound - runs a single round on all configured channels
 * This is separated from execute so you can call it from a scheduler or manually.
 */
export async function startRandomRound() {
  try {
    for (const config of Object.values(GAME_CHANNELS)) {
      const channelId = process.env[config.envVar];
      if (!channelId) continue;

      const gameChannel = global.client.channels.cache.get(channelId);
      if (!gameChannel) continue;

      const guildId = gameChannel.guildId;
      const channelIdLocal = gameChannel.id;
      if (!gameStates.has(guildId)) gameStates.set(guildId, new Map());
      const guildGames = gameStates.get(guildId);

      clearAllTimers(guildId, channelIdLocal);

      const wordList = WORD_DATABASE[config.difficulty] || [];
      if (!wordList.length) continue;

      const word = wordList[Math.floor(Math.random() * wordList.length)];
      const state = {
        channel: gameChannel,
        word,
        wordNormalized: normalizeForCompare(word),
        isActive: true,
        startTime: Date.now(),
        timeouts: [],
        attempts: 0,
        difficulty: config.difficulty
      };
      guildGames.set(channelIdLocal, state);

      const wordLength = word.length;
      const newRoundEmbed = new EmbedBuilder()
        .setColor(config.difficulty === 'easy' ? 0x00FF88 : config.difficulty === 'medium' ? 0xFFD700 : 0xFF4444)
        .setTitle(`${CUSTOM_EMOJIES.rec ?? emoji('chat')} NOVA RUNDA - ${config.name.toUpperCase()}`)
        .setDescription(`🎮 **POGODI REC!**\n\n**Reč: ${word.toUpperCase()}**\n\nImaš **${config.timeLimit} sekundi** da napišeš ovu reč!\n\n📏 Reč ima **${wordLength} slova**`)
        .addFields(
          { name: '📝 Upustva', value: 'Kucaj reč direktno u kanal. Ko brže pogodi - taj je pobednik!', inline: false },
          { name: `${CUSTOM_EMOJIES.vreme} Vreme`, value: `**${config.timeLimit}s**`, inline: true },
          { name: `${CUSTOM_EMOJIES.fastest} Težina`, value: `**${config.name}**`, inline: true }
        )
        .setFooter({ text: 'discord.gg/adrenalin | Srecno!' })
        .setTimestamp();

      await gameChannel.send({ embeds: [newRoundEmbed] }).catch(() => {});

      const resetTimeout = setTimeout(async () => {
        if (state.isActive) {
          state.isActive = false;
          clearAllTimers(guildId, channelIdLocal);

          const timeoutEmbed = new EmbedBuilder()
            .setColor(0xFF4444)
            .setTitle('⏰ VREME ISTEKLO!')
            .setDescription(`Niko nije pogodio reč!\n\n🎯 **Reč je bila: ${state.word.toUpperCase()}**`)
            .addFields({ name: '📖 Odgovor', value: `**${state.word.toUpperCase()}**`, inline: false })
            .setFooter({ text: 'Sledeca runda za 30 minuta!' })
            .setTimestamp();

          await gameChannel.send({ embeds: [timeoutEmbed] }).catch(() => {});
        }
      }, config.timeLimit * 1000);

      state.timeouts.push(resetTimeout);
    }
  } catch (e) {
    console.error('startRandomRound error:', e);
  }
}

//

// ========== EXPORTS ==========
export { gameStates, leaderboards, playerStats, WORD_DATABASE };
export default { meta, execute, handleWordGame, startWordGameScheduler };
