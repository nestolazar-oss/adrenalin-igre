// utils/emojis.js - Adrenalin Bot Custom Emojis

export const CUSTOM_EMOJIS = {
  // ========== ACTIONS ==========
  success: '<:adrenalin_accept:1434629125582225409>',
  error: '<:adrenalin_reject:1434629125582225409>',
  warning: '<:adrenalin_warn:1434629908923027479>',
  info: '<:adrenalin_info:1434628553785479392>',
  reject: '<:adrenalin_reject:1434629125582225409>',
  accept: '<:adrenalin_accept:1434629125582225409>',
  
  // ========== GAMING ==========
  gamepad: '<:adrenalin_gamepad:1434624881408086197>',
  dice: '<:adrenalin_dice:>',
  cards: '<:adrenalin_cards:>',
  puzzle: '<:adrenalin_puzzle:>',
  trophy: '<:adrenalin_trophy:1434629562783891546>',
  medal_gold: '<:adrenalin_medal_gold:>',
  medal_silver: '<:adrenalin_medal_silver:>',
  medal_bronze: '<:adrenalin_medal_bronze:>',
  star: '<:adrenalin_star:>',
  
  // ========== MONEY ==========
  coins: '<:adrenalin_coins:1434624841704800428>',
  cash: '<:adrenalin_coins:1434624841704800428>',
  bank: '<:adrenalin_bank:1434624812931748021>',
  wallet: '<:adrenalin_bank_balance:1434625581617512520>',
  money_bag: '💸',
  
  // ========== TIME ==========
  clock: '<:adrenalin_clock:1434625642061889576>',
  timer: '<:adrenalin_clock:1434625642061889576>',
  hourglass: '⏳',
  
  // ========== ACTIONS & EMOTIONS ==========
  bomb: '💣',
  gem: '💎',
  fire: '🔥',
  ice: '❄️',
  lightning: '<:adrenalin_friction:1434624879348416683>',
  heart: '<:adrenalin_heart:>',
  celebration: '<:adrenalin_tada:1434629556274331728>',
  party: '<:adrenalin_party:>',
  sparkles: '<:adrenalin_heart:1434624891243597825>',
  thinking: '<:adrenalin_thinking:>',
  linked: '<:adrenalin_unlinked:1434629564511813662>',
  // ========== DIRECTIONS ==========
  up: '<:adrenalin_up:>',
  down: '<:adrenalin_down:>',
  left: '<:adrenalin_left:>',
  right: '<:adrenalin_right:>',
  arrow_up: '<:adrenalin_arrow_leftup:>',
  arrow_down: '<:adrenalin_arrow_leftdown:>',
  
  // ========== GAME SPECIFIC ==========
  target: '<:adrenalin_target:>',
  flag: '<:adrenalin_flag:>',
  map: '<:adrenalin_map:>',
  gift: '<:adrenalin_gift:1434625847867867247>',
  // ========== STATS & INFO ==========
  stats: '<:adrenalin_stats:1434629278007300187>',
  chat: '<:adrenalin_chat:1434624836751200348>',
  repeat: '<:adrenalin_repeat:1434628641299497123>',
  tada: '<:adrenalin_tada:1434629556274331728>',
  warn: '<:adrenalin_warn:1434629908923027479>',
  menu: '<:adrenalin_menu:1434628602132959253>',
  search: '<:adrenalin_search:1434629160759988234>',
  survey: '<:adrenalin_survey:1434628664724553880>',
  wrench: '<:adrenalin_wrench:1434629927738675412>',
  hammer: '<:adrenalin_moderation_visible:1434628610030829568>',
  
  // ========== MEMORY GAME ==========
  memory_open: '<:adrenalin_memory_open:>',
  memory_closed: '<:adrenalin_memory_closed:>',
  memory_match: '<:adrenalin_memory_match:>',
  
  // ========== TRIVIA ==========
  trivia_question: '📚',
  trivia_a: 'A️⃣',
  trivia_b: 'B️⃣',
  trivia_c: 'C️⃣',
  trivia_d: 'D️⃣',
  trivia_correct: '✅',
  trivia_wrong: '❌',
  
  // ========== RIDDLE ==========
  riddle_hint: '💡',
  riddle_time: '⏰',
  riddle_solved: '🎉',
  riddle_failed: '😢',
  
  // ========== SYMBOLS ==========
  question: '<:adrenalin_question:>',
  exclamation: '❗',
  plus: '<:adrenalin_plus:>',
  minus: '<:adrenalin_minus:>',
  multiply: '✖️',
  divide: '➗',
  equals: '🟰',
  
  // ========== NUMBERS ==========
  one: '1️⃣',
  two: '2️⃣',
  three: '3️⃣',
  four: '4️⃣',
  five: '5️⃣',
  
  // ========== GAME BOARDS ==========
  heart_diamonds: '💎',
  clubs: '♣️',
  spades: '♠️',
  diamonds: '♦️',
  hearts: '♥️',

  // Tiketi
  ticket: '<:adrenalin_ticket:1434629557691879647>',
  ticket_open: '<:adrenalin_ticket:>',
  ticket_close: '<:adrenalin_ticket:>',
  ticket_delete: '<:adrenalin_ticket:>',
  ticket_add: '<:adrenalin_ticket:>',
  ticket_remove: '<:adrenalin_ticket:>',
  ticket_claim: '<:adrenalin_ticket:>',
  ticket_priority: '<:adrenalin_ticket:>',
  ticket_transcript: '<:adrenalin_ticket:>',
  ticket_alert: '<:adrenalin_ticket:>',
  ticket_assign: '<:adrenalin_ticket:>'
};

// Globalna emoji funkcija
export function emoji(key) {
  return CUSTOM_EMOJIS[key] || '❓';
}

// Export kao default za kompatibilnost
export default {
  CUSTOM_EMOJIS,
  emoji
};
