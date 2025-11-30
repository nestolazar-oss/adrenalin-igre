// =========================
// CUSTOM EMOJI-JI
// =========================

export const CUSTOM_EMOJIS = {
  // GAMING
  gamepad: '<:adrenalin_gamepad:1434624881408086197>',
  dice: '🎲',
  cards: '🃏',
  puzzle: '🧩',
  trophy: '<:adrenalin_trophy:1434629562783891546>',
  medal_gold: '🥇',
  medal_silver: '🥈',
  medal_bronze: '🥉',
  star: '⭐',
  tacka: '<:adrenalin_tacka:1434629329328930937>',
  
  // MONEY
  coins: '<:adrenalin_coins:1434624841704800428>',
  cash: '💵',
  bank: '<:adrenalin_bank_balance:1434625581617512520>',
  wallet: '💰',
  
  // ACTIONS
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  loading: '⏳',
  clock: '<:adrenalin_clock:1434625642061889576>',
  timer: '⏲️',
  
  // GAMING SPECIFICS
  bomb: '💣',
  gem: '💎',
  flag: '🚩',
  target: '🎯',
  fire: '🔥',
  ice: '❄️',
  lightning: '<:adrenalin_friction:1434624879348416683>',
  
  // DIRECTIONS
  up: '⬆️',
  down: '⬇️',
  left: '⬅️',
  right: '➡️',
  
  // SYMBOLS
  heart: '❤️',
  question: '❓',
  exclamation: '❗',
  sparkles: '✨',
  thinking: '🤔',
  celebration: '🎉',
  party: '🎊',
  
  // ACCEPT/REJECT
  accept: '<:adrenalin_accept:1434629125582225409>',
  reject: '<:adrenalin_reject:1434629125582225409>',
  
  // STATS & INFO
  stats: '<:adrenalin_stats:1434629278007300187>',
  chat: '<:adrenalin_chat:1434624836751200348>',
  repeat: '<:adrenalin_repeat:1434628641299497123>',
  tada: '<:adrenalin_tada:1434629556274331728>',
  warn: '<:adrenalin_warn:1434629908923027479>',
  menu: '<:adrenalin_menu:1434628602132959253>',
  search: '<:adrenalin_search:1434629160759988234>',
  survey: '<:adrenalin_survey:1434628664724553880>',
  wrench: '<:adrenalin_wrench:1434629927738675412>',
  
  // MEMORY GAME
  memory_open: '📖',
  memory_closed: '🟫',
  memory_match: '✨',
  
  // TRIVIA
  trivia_question: '📚',
  trivia_a: 'A️⃣',
  trivia_b: 'B️⃣',
  trivia_c: 'C️⃣',
  trivia_d: 'D️⃣',
  trivia_correct: '✅',
  trivia_wrong: '❌',
  
  // RIDDLE
  riddle_hint: '💡',
  riddle_time: '⏰',
  riddle_solved: '🎉',
  riddle_failed: '😢'
};

// =========================
// FUNKCIJA ZA KORIŠTENJE
// =========================

export function emoji(key) {
  return CUSTOM_EMOJIS[key] || '❓';
}
