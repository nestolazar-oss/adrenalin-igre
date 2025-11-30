import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas } from 'canvas';
import srDict from 'dictionary-sr-latn';
import fetch from 'node-fetch'; // za skidanje avatara

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const meta = {
  name: 'word',
  aliases: ['rec', 'reci', 'wg', 'wordgame'],
  description: 'Word Game - Pogodi rec u datom vremenu'
};

// ===== STATE =====
export const gameStates = new Map();      // Map<guildId, Map<channelId, state>>
export const leaderboards = new Map();    // Map<guildId, Map<channelId, Map<userId, stats>>>
export const playerStats = new Map();     // Map<userId, stats>
export let WORD_DATABASE = { easy: [], medium: [], hard: [] };

// ===== CUSTOM EMOJIES (isto u oba bota) =====
export const CUSTOM_EMOJIES = {
  pobednik: '<:adrenalin_trophy:1434629562783891546>',
  vreme: '<:adrenalin_clock:1434625642061889576>',
  rec: '<:adrenalin_chat:1434624836751200348>',
  average: '<:adrenalin_stats:1434629278007300187>',
  pobedu: '<:adrenalin_tada:1434629556274331728>',
  fastest: '<:adrenalin_repeat:1434628641299497123>'
};

// ===== CONFIG PATHS =====
const LEADERBOARD_DIR = path.join(__dirname, '..', '..', 'data');
const LEADERBOARD_FILE = path.join(LEADERBOARD_DIR, 'word_leaderboard.json');
const PLAYER_STATS_FILE = path.join(LEADERBOARD_DIR, 'word_stats.json');

const GAME_CHANNELS = {
  easy: { envVar: 'WORD_CHANNEL_EASY', difficulty: 'easy', name: 'Lako', timeLimit: 120, reward: 75 },
  medium: { envVar: 'WORD_CHANNEL_MEDIUM', difficulty: 'medium', name: 'Srednje', timeLimit: 180, reward: 150 },
  hard: { envVar: 'WORD_CHANNEL_HARD', difficulty: 'hard', name: 'Tesko', timeLimit: 240, reward: 300 }
};

const ROUND_INTERVAL = 30 * 60 * 1000; // 30 minuta

// ===== STOPWORDS & SUFFIXES =====
const RAW_STOPWORDS = [
  'ali','ili','niti','jer','ako','mada','tek','premda','iako','da','se','ja','ti','on','ona','ono','mi','vi','oni','one',
  'me','te','nas','vas','mu','joj','jesam','jesi','jeste','je','smo','ste','su','sam','biti','bih','bi','bismo','biste',
  'hocu','hoces','hoce','hocemo','hocete','hteo','htela','za','od','u','na','iz','sa','kod','bez','kroz','pred','pri','po','do',
  'pored','ispod','iznad','iza','ispred','pokraj','usred','nasuprot','a','ne','to','sto','sta','gde','gdje','kada','kad',
  'kako','koga','kog','zasto','nije','nisu','nismo','niste','nisam','nisi','ovaj','taj','onaj','ovo','ono','ova','ta','ona',
  'koji','koja','koje','kojeg','kojoj','kojim','kojih','koliko','koliki','kolika','kolike'
];

const DERIVATIONAL_SUFFIXES = ['ica','čka','čić','čak','čko','ina','ara'];

function normalizeForCompare(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/dž/g, 'dz')
    .replace(/đ/g, 'dj')
    .replace(/[čć]/g, 'c')
    .replace(/ž/g, 'z')
    .replace(/š/g, 's')
    .replace(/[^a-z]/g, '');
}
const STOPWORDS = new Set(RAW_STOPWORDS.map(normalizeForCompare));

// ===== FILE HELPERS =====
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
          userMap.set(userId, stats);
        }
        guildLb.set(channelId, userMap);
      }
    }
    console.log('📖 Word Game: Leaderboard ucitan');
  } catch (e) { console.error('Load error:', e.message); }
}

async function saveLeaderboards() {
  try {
    await ensureDir();
    const data = {};
    for (const [guildId, channels] of leaderboards.entries()) {
      data[guildId] = {};
      for (const [channelId, userMap] of channels.entries()) {
        data[guildId][channelId] = Object.fromEntries(userMap);
      }
    }
    await fs.writeFile(LEADERBOARD_FILE, JSON.stringify(data, null, 2));
  } catch (e) { console.error('Save error:', e.message); }
}

async function loadPlayerStats() {
  try {
    await ensureDir();
    const data = await fs.readFile(PLAYER_STATS_FILE, 'utf8').catch(() => null);
    if (!data) return;
    const json = JSON.parse(data);
    for (const [userId, stats] of Object.entries(json)) playerStats.set(userId, stats);
    console.log('📖 Word Game: Player stats ucitani');
  } catch (e) { console.error('Stats load error:', e.message); }
}

async function savePlayerStats() {
  try {
    await ensureDir();
    const data = Object.fromEntries(playerStats);
    await fs.writeFile(PLAYER_STATS_FILE, JSON.stringify(data, null, 2));
  } catch (e) { console.error('Stats save error:', e.message); }
}

// ===== GUARD / VALIDATION for guesses =====
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

// ===== AVATAR LOADER =====
async function loadAvatarImage(url) {
  try {
    if (!url) return null;
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

// ===== IMAGE GENERATOR (enhanced) =====
async function generateVictoryImage(username, word, duration, difficulty, avatarUrl) {
  try {
    const width = 800;
    const height = 350;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#0a0e27');
    grad.addColorStop(0.5, '#1a1f4d');
    grad.addColorStop(1, '#0a0e27');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Grid
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

    // Particles
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 2 + 0.5;
      ctx.fillRect(x, y, size, size);
    }

    // Avatar
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
          ctx.drawImage(
            img,
            avatarX - (avatarRadius - 5),
            avatarY - (avatarRadius - 5),
            (avatarRadius - 5) * 2,
            (avatarRadius - 5) * 2
          );
          ctx.restore();
        }
      } catch (e) {
        console.error('Avatar render error:', e.message);
      }
    }

    // Text
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

    // Footer & badge
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

// ===== WORD DATABASE INITIALIZATION =====
// If you have dictionary-sr-latn, plug it here (optional). Otherwise we use fallback lists.
async function initializeWordDatabaseWithFiltering() {
  try {
    // fallback builtins
    WORD_DATABASE = {
      easy: ['macka','pas','kuca','voda','nebo','sunce','mesec','boja','hleb','pica','stol','vrata','prozor','gitara','knjiga'],
      medium: ['zgrada','gradina','stablo','lisce','cvet','ptica','automobil','muzika','telefon','kompjuter','tastatura','monitor','profesor','student'],
      hard: ['temperatura','elektriciteta','republika','demokratija','filozofija','psihologija','matematika','geografija','biologija']
    };
    console.log('⚠️ Koristim fallback reči (srDict nije dostupan ili nije konfigurisano).');
  } catch (e) {
    console.error('❌ Greška pri učitavanju rečnika:', e.message);
  }
}

// simple derived-word detector used by the advanced loader (kept here for future)
function isValidGameWord(word, allWordsSet) {
  if (!word || word.length < 3 || word.length > 15) return false;
  if (!/^[a-zčćžšđ]+$/i.test(word)) return false;
  const normalized = word.toLowerCase();
  for (const suffix of DERIVATIONAL_SUFFIXES) {
    if (normalized.endsWith(suffix) && normalized.length > suffix.length + 2) {
      const baseForm = normalized.slice(0, -suffix.length);
      if (allWordsSet && allWordsSet.has(baseForm)) {
        if ((suffix === 'čko' || suffix === 'čka') && baseForm.length <= 4) return true;
        return false;
      }
    }
  }
  return true;
}

// ===== SCHEDULER =====
function findChannelConfig(channelId) {
  for (const cfg of Object.values(GAME_CHANNELS)) if (process.env[cfg.envVar] === channelId) return cfg;
  return null;
}

function clearAllTimers(guildId, channelId) {
  try {
    const guildGames = gameStates.get(guildId);
    const state = guildGames?.get(channelId);
    if (state?.timeouts) { state.timeouts.forEach(t => clearTimeout(t)); state.timeouts = []; }
  } catch (e) { console.error('Clear timers error:', e); }
}

export function startWordGameScheduler(client) {
  initializeWordDatabaseWithFiltering().then(async () => {
    await loadLeaderboards().catch(console.error);
    await loadPlayerStats().catch(console.error);

    const available = [];
    for (const cfg of Object.values(GAME_CHANNELS)) {
      const channelId = process.env[cfg.envVar];
      if (!channelId) continue;
      const ch = client.channels.cache.get(channelId);
      if (!ch) continue;
      available.push({ cfg, ch });
    }
    if (available.length === 0) {
      console.warn('⚠️ Word Game: Nema dostupnih game channels!');
      return;
    }

    const startRandomRound = async () => {
      try {
        const selected = available[Math.floor(Math.random() * available.length)];
        const { cfg, ch } = selected;

        const guildId = ch.guildId;
        const channelId = ch.id;
        if (!gameStates.has(guildId)) gameStates.set(guildId, new Map());
        const guildGames = gameStates.get(guildId);

        clearAllTimers(guildId, channelId);

        const wordList = WORD_DATABASE[cfg.difficulty] || [];
        if (!wordList.length) return;

        const word = wordList[Math.floor(Math.random() * wordList.length)];

        const state = {
          channel: ch,
          word,
          wordNormalized: normalizeForCompare(word),
          isActive: true,
          startTime: Date.now(),
          timeouts: [],
          attempts: 0,
          difficulty: cfg.difficulty,
          reward: cfg.reward
        };
        guildGames.set(channelId, state);

        const embed = new EmbedBuilder()
          .setColor(cfg.difficulty === 'easy' ? 0x00FF88 : cfg.difficulty === 'medium' ? 0xFFD700 : 0xFF4444)
          .setTitle(`${CUSTOM_EMOJIES.rec} NOVA RUNDA - ${cfg.name.toUpperCase()}`)
          .setDescription(`🎮 **POGODI REC!**\n\n**Reč: ${word.toUpperCase()}**\n\nImaš **${cfg.timeLimit} sekundi** da napišeš ovu reč!\n\n📏 Reč ima **${word.length} slova**`)
          .addFields(
            { name: '📝 Upustva', value: 'Kucaj reč direktno u kanal. Ko brže pogodi - taj je pobednik!', inline: false },
            { name: `${CUSTOM_EMOJIES.vreme} Vreme`, value: `**${cfg.timeLimit}s**`, inline: true },
            { name: `${CUSTOM_EMOJIES.fastest} Težina`, value: `**${cfg.name}**`, inline: true }
          )
          .setFooter({ text: 'discord.gg/adrenalin | Srecno!' })
          .setTimestamp();

        await ch.send({ embeds: [embed] }).catch(() => {});

        const resetTimeout = setTimeout(async () => {
          if (state.isActive) {
            state.isActive = false;
            clearAllTimers(guildId, channelId);

            const timeoutEmbed = new EmbedBuilder()
              .setColor(0xFF4444)
              .setTitle('⏰ VREME ISTEKLO!')
              .setDescription(`Niko nije pogodio reč!\n\n🎯 **Reč je bila: ${state.word.toUpperCase()}**`)
              .setFooter({ text: 'Sledeca runda za 30 minuta!' })
              .setTimestamp();

            await ch.send({ embeds: [timeoutEmbed] }).catch(() => {});
          }
        }, cfg.timeLimit * 1000);

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

// ===== MESSAGE HANDLER =====
export async function handleWordGame(message) {
  try {
    if (message.author.bot) return;

    const guildId = message.guildId;
    const channelId = message.channelId;
    const guildGames = gameStates.get(guildId);
    if (!guildGames) return;

    const state = guildGames.get(channelId);
    if (!state || !state.isActive) return;

    const guess = isValidGuess(message.content);
    if (!guess) return;

    state.attempts = (state.attempts || 0) + 1;

    if (guess === state.wordNormalized) {
      state.isActive = false;
      clearAllTimers(guildId, channelId);

      const duration = Math.floor((Date.now() - state.startTime) / 1000);

      // OPTIONAL: if you have old bot economy, credit user here.
      // Example: const user = initUser(message.author.id); user.cash += state.reward; updateUser(message.author.id, user);
      try { /* plug your initUser/updateUser if needed */ } catch (e) {}

      updateLeaderboard(guildId, channelId, message.author.id, duration);
      updatePlayerStats(message.author.id, duration, state.difficulty);
      await saveLeaderboards();
      await savePlayerStats();

      const avatarUrl = message.author.displayAvatarURL?.({ format: 'png', size: 256 });
      const imageBuffer = await generateVictoryImage(message.author.username, state.word, duration, state.difficulty, avatarUrl);

      if (imageBuffer) {
        const attachment = new AttachmentBuilder(imageBuffer, { name: 'victory.png' });
        await message.reply({ files: [attachment] }).catch(() => {});
      } else {
        await message.reply(`${CUSTOM_EMOJIES.pobednik} <@${message.author.id}> je pogodio/la reč: **${state.word}** (${duration}s)`).catch(() => {});
      }
    } else {
      message.react('❌').catch(() => {});
    }
  } catch (e) {
    console.error('handleWordGame error:', e);
  }
}

// ===== LEADERBOARD & STATS HELPERS =====
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

// ===== COMMAND EXECUTOR =====
export async function execute(message, args, context) {
  const subcommand = args[0]?.toLowerCase();
  const { OWNER_ID, PREFIX, isWhitelisted } = context || {};
  const userAllowed = message.author.id === OWNER_ID || (isWhitelisted && isWhitelisted(message.member));

  if (subcommand === 'start') {
  // Svi mogu start - uklonjena provera userAllowed

  const available = [];
  for (const cfg of Object.values(GAME_CHANNELS)) {
    const channelId = process.env[cfg.envVar];
    if (!channelId) continue;
    const gameChannel = message.client.channels.cache.get(channelId);
    if (!gameChannel) continue;
    available.push({ cfg, gameChannel });
  }

  if (available.length === 0) {
    return message.reply('❌ Nema dostupnih game channels! Provjeri .env varijable.');
  }

  const selected = available[Math.floor(Math.random() * available.length)];
  const { cfg, gameChannel } = selected;

  const guildId = gameChannel.guildId;
  const channelId = gameChannel.id;
  if (!gameStates.has(guildId)) gameStates.set(guildId, new Map());
  const guildGames = gameStates.get(guildId);

  clearAllTimers(guildId, channelId);

  const wordList = WORD_DATABASE[cfg.difficulty] || [];
  if (!wordList.length) return message.reply('❌ Nema dostupnih reči za ovu težinu!');

  const word = wordList[Math.floor(Math.random() * wordList.length)];
  const state = {
    channel: gameChannel,
    word,
    wordNormalized: normalizeForCompare(word),
    isActive: true,
    startTime: Date.now(),
    timeouts: [],
    attempts: 0,
    difficulty: cfg.difficulty,
    reward: cfg.reward
  };
  guildGames.set(channelId, state);

  const wordLength = word.length;
  const newRoundEmbed = new EmbedBuilder()
    .setColor(cfg.difficulty === 'easy' ? 0x00FF88 : cfg.difficulty === 'medium' ? 0xFFD700 : 0xFF4444)
    .setTitle(`${CUSTOM_EMOJIES.rec} NOVA RUNDA - ${cfg.name.toUpperCase()}`)
    .setDescription(`🎮 **POGODI REC!**\n\n**Reč: ${word.toUpperCase()}**\n\nImaš **${cfg.timeLimit} sekundi** da napišeš ovu reč!\n\n📏 Reč ima **${wordLength} slova**`)
    .addFields(
      { name: '📝 Upustva', value: 'Kucaj reč direktno u kanal. Ko brže pogodi - taj je pobednik!', inline: false },
      { name: `${CUSTOM_EMOJIES.vreme} Vreme`, value: `**${cfg.timeLimit}s**`, inline: true },
      { name: `${CUSTOM_EMOJIES.fastest} Težina`, value: `**${cfg.name}**`, inline: true }
    )
    .setFooter({ text: 'discord.gg/adrenalin | Srecno!' })
    .setTimestamp();

  await gameChannel.send({ embeds: [newRoundEmbed] }).catch(() => {});

  const confirmEmbed = new EmbedBuilder()
    .setColor(0x00FF88)
    .setTitle('✅ Word Game runda pokrenuta!')
    .setDescription(`Igra je pokrenuta u <#${channelId}>\nReč: **${word.toUpperCase()}** (${wordLength} slova)\nTežina: **${cfg.name}**`);

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
        combined.wins += stats.wins;
        combined.fastestTime = Math.min(combined.fastestTime, stats.fastestTime);
        combined.totalTime += stats.totalTime || 0;
      }
    }

    const sorted = Array.from(allStats.entries()).sort((a, b) => b[1].wins - a[1].wins).slice(0, 10);
    const lines = sorted.map((e, i) => {
      const avg = Math.round(e[1].totalTime / e[1].wins);
      return `${i + 1}. <@${e[0]}> - ${CUSTOM_EMOJIES.pobedu} **${e[1].wins}** | ${CUSTOM_EMOJIES.fastest} **${e[1].fastestTime}s** | ${CUSTOM_EMOJIES.average} **${avg}s**`;
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
    const diffLines = Object.entries(stats.difficulties || {}).map(([diff, data]) => `> **${diff}:** ${CUSTOM_EMOJIES.pobedu} ${data.wins} | ${CUSTOM_EMOJIES.fastest} ${data.bestTime}s`).join('\n');

    const embed = new EmbedBuilder()
      .setColor(0x00A8FF)
      .setTitle('📊 Statistika')
      .setDescription(`<@${userId}>\n\n${CUSTOM_EMOJIES.pobedu} **Ukupno pobeda:** ${stats.totalWins}\n${CUSTOM_EMOJIES.average} **Prosečno vreme:** ${stats.avgTime}s\n${CUSTOM_EMOJIES.fastest} **Najbolje vreme:** ${stats.bestTime === Infinity ? 'N/A' : stats.bestTime + 's'}\n\n${diffLines}`);

    return message.reply({ embeds: [embed] });
  }

  if (!userAllowed) return message.reply('Samo vlasnik ili whitelistovani mogu koristiti ovu komandu.');

  const helpEmbed = new EmbedBuilder()
    .setColor(0x00A8FF)
    .setTitle('📖 Word Game')
    .setDescription(`Igra se automatski svakih 30 minuta u game kanalima\n\n\`${PREFIX || '-'}wg start\` - Pokreni rundu manuelno\n\`${PREFIX || '-'}wg lb\` - Leaderboard\n\`${PREFIX || '-'}wg stats\` - Tvoja statistika\n\`${PREFIX || '-'}wg stats @korisnik\` - Statistika drugog korisnika`);

  return message.reply({ embeds: [helpEmbed] });
}

export default { meta, execute, handleWordGame, startWordGameScheduler };
