import { EmbedBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import embeds from '../../utils/embeds.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ANTIHOIST_FILE = path.join(__dirname, '../../data/antihoist.json');

async function ensureAntihoistFile() {
  try {
    await fs.mkdir(path.dirname(ANTIHOIST_FILE), { recursive: true });
    try {
      await fs.access(ANTIHOIST_FILE);
    } catch {
      await fs.writeFile(ANTIHOIST_FILE, JSON.stringify({}, null, 2));
    }
  } catch (e) {
    console.error('Antihoist file error:', e);
  }
}

async function getAntihoistConfig() {
  await ensureAntihoistFile();
  try {
    const data = await fs.readFile(ANTIHOIST_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveAntihoistConfig(config) {
  await ensureAntihoistFile();
  await fs.writeFile(ANTIHOIST_FILE, JSON.stringify(config, null, 2));
}

function removeHoistCharacters(text) {
  const hoistChars = /^[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>?\/`~]/;
  let cleaned = text;
  while (hoistChars.test(cleaned)) {
    cleaned = cleaned.replace(hoistChars, '');
  }
  return cleaned || 'NoName';
}

export const meta = {
  name: 'antihoist',
  description: 'Uključi/isključi antihoist sistem'
};

export async function execute(message, args) {
  if (!message.member.permissions.has('ManageGuild')) {
    return message.reply(embeds.error('Greška', `${emoji('reject')} Nemaš dozvolu!`));
  }

  const action = args[0]?.toLowerCase();
  const config = await getAntihoistConfig();
  const guildId = message.guildId;

  if (!config[guildId]) {
    config[guildId] = { enabled: false };
  }

  if (action === 'on' || action === 'enable') {
    config[guildId].enabled = true;
    await saveAntihoistConfig(config);

    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle(`${emoji('success')} Antihoist Uključen`)
      .setDescription('Automatski ću menjati nadimke sa zabranjenim znakovima na početku!')
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  if (action === 'off' || action === 'disable') {
    config[guildId].enabled = false;
    await saveAntihoistConfig(config);

    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`${emoji('reject')} Antihoist Isključen`)
      .setDescription('Neću više menjati nadimke sa zabranjenim znakovima.')
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  const status = config[guildId].enabled ? `${emoji('success')} UKLJUČEN` : `${emoji('reject')} ISKLJUČEN`;
  const embed = new EmbedBuilder()
    .setColor(0x3498DB)
    .setTitle('ℹ️ Antihoist Status')
    .setDescription(`Trenutni status: ${status}`)
    .addFields(
      { name: 'Komande', value: '`-antihoist on` - Uključi\n`-antihoist off` - Isključi', inline: false }
    )
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}

// Handler za automatsku promenu nadimaka
export async function handleAntihoistMember(member) {
  try {
    const config = await getAntihoistConfig();
    if (!config[member.guild.id]?.enabled) return;

    const hoistRegex = /^[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>?\/`~]/;
    if (hoistRegex.test(member.displayName)) {
      const newName = removeHoistCharacters(member.displayName);
      await member.setNickname(newName, 'Antihoist sistem');
    }
  } catch (e) {
    console.error('Antihoist error:', e);
  }
}
