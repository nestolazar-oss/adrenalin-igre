import { EmbedBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import embeds from '../../utils/embeds.js';

const __dirname_rem = path.dirname(fileURLToPath(import.meta.url));
const REMINDERS_FILE = path.join(__dirname_rem, '../../data/reminders.json');

// ===================== FILE SYSTEM =====================

async function ensureRemindersFile() {
  try {
    await fs.mkdir(path.dirname(REMINDERS_FILE), { recursive: true });
    try {
      await fs.access(REMINDERS_FILE);
    } catch {
      await fs.writeFile(REMINDERS_FILE, JSON.stringify({}, null, 2));
    }
  } catch (e) {
    console.error('Reminders file error:', e);
  }
}

async function getReminders() {
  await ensureRemindersFile();
  try {
    const data = await fs.readFile(REMINDERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveReminders(reminders) {
  await ensureRemindersFile();
  await fs.writeFile(REMINDERS_FILE, JSON.stringify(reminders, null, 2));
}

// ===================== COMMAND META =====================

export const meta_reminders = {
  name: 'reminder',
  description: 'Upravljaj podsetnicima',
  aliases: ['remind']
};

// ===================== COMMAND HANDLER =====================

export async function execute_reminders(message, args) {
  const action = args[0]?.toLowerCase();

  // --------------------- CREATE ---------------------
  if (action === 'create') {
    const timeStr = args[1];
    const text = args.slice(2).join(' ');

    if (!timeStr || !text) {
      return message.reply(
        embeds.error('Greška', `${emoji('error')} Koristi: \`-reminder create <10m|1h|1d> <tekst>\``)
      );
    }

    // Parse vremena
    const match = timeStr.match(/(\d+)([smhd])/);
    if (!match) {
      return message.reply(
        embeds.error('Greška', `${emoji('error')} Format: \`10s|30m|1h|1d\``)
      );
    }

    const amount = parseInt(match[1]);
    const unit = match[2];
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    const duration = amount * multipliers[unit];

    const reminderId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const reminders = await getReminders();
    const userId = message.author.id;

    if (!reminders[userId]) reminders[userId] = [];

    const reminder = {
      id: reminderId,
      text,
      remindAt: Date.now() + duration,
      created: new Date().toISOString()
    };

    reminders[userId].push(reminder);
    await saveReminders(reminders);

    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle(`${emoji('success')} Podsetnik Kreiran`)
      .setDescription(text)
      .addFields(
        { name: `${emoji('clock')} Za`, value: timeStr, inline: true },
        { name: 'ID', value: reminderId, inline: true }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  // --------------------- LIST ---------------------
  if (action === 'list') {
    const reminders = await getReminders();
    const userReminders = reminders[message.author.id] || [];

    if (userReminders.length === 0) {
      return message.reply(
        embeds.error('Info', `${emoji('success')} Nemaš aktivnih podsetnika!`)
      );
    }

    const lines = userReminders.map((r, i) => {
      const timeLeft = Math.floor((r.remindAt - Date.now()) / 1000);
      const hours = Math.floor(timeLeft / 3600);
      const minutes = Math.floor((timeLeft % 3600) / 60);
      return `${i + 1}. **${r.text}** – za ${hours}h ${minutes}m`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setColor(0x2596BE)
      .setTitle(`${emoji('clock')} Tvoji Podsetnici`)
      .setDescription(lines)
      .setFooter({ text: `Ukupno: ${userReminders.length}` })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  return message.reply(
    embeds.error('Greška', `${emoji('error')} Koristi: \`-reminder <create|list>\``)
  );
}

// ===================== AUTO REMINDER CHECK =====================

export async function checkReminders(client) {
  const reminders = await getReminders();
  let changed = false;

  for (const userId of Object.keys(reminders)) {
    const userReminders = reminders[userId];

    for (const reminder of [...userReminders]) {
      if (Date.now() >= reminder.remindAt) {
        changed = true;

        try {
          const user = await client.users.fetch(userId);

          const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle(`${emoji('clock')} Podsetnik!`)
            .setDescription(reminder.text)
            .setTimestamp();

          await user.send({ embeds: [embed] });
        } catch (e) {
          console.error(`DM error for ${userId}:`, e);
        }

        // ukloni
        reminders[userId] = reminders[userId].filter(r => r.id !== reminder.id);
      }
    }

    // obriši user entry ako je prazan
    if (reminders[userId].length === 0) {
      delete reminders[userId];
      changed = true;
    }
  }

  if (changed) {
    await saveReminders(reminders);
  }
}
