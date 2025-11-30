import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GIVEAWAY_FILE = path.join(__dirname, '../../data/giveaways.json');

async function ensureGiveawayFile() {
  try {
    await fs.mkdir(path.dirname(GIVEAWAY_FILE), { recursive: true });
    try {
      await fs.access(GIVEAWAY_FILE);
    } catch {
      await fs.writeFile(GIVEAWAY_FILE, JSON.stringify({}, null, 2));
    }
  } catch (e) {
    console.error('Giveaway file error:', e);
  }
}

async function getGiveaways() {
  await ensureGiveawayFile();
  try {
    const data = await fs.readFile(GIVEAWAY_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveGiveaways(giveaways) {
  await ensureGiveawayFile();
  await fs.writeFile(GIVEAWAY_FILE, JSON.stringify(giveaways, null, 2));
}

export const meta = {
  name: 'gstart',
  description: 'Kreiraj giveaway'
};

export async function execute(message, args) {
  if (!message.member.permissions.has('ManageGuild')) {
    return message.reply(`${emoji('reject')} Nemaš dozvolu!`);
  }

  const durationStr = args[0];
  const prize = args.slice(1).join(' ');
  const winnersCount = parseInt(args[args.length - 1]) || 1;

  if (!durationStr || !prize) {
    return message.reply(`${emoji('error')} Koristi: \`-gstart <10m|1h|1d> <nagrada> [broj pobednika]\``);
  }

  // Parse vremena
  const match = durationStr.match(/(\d+)([smhd])/);
  if (!match) {
    return message.reply(`${emoji('error')} Format: \`10m|1h|1d\``);
  }

  const amount = parseInt(match[1]);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  const duration = amount * (multipliers[unit] || 1000);

  const giveawayId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const endsAt = Date.now() + duration;

  // Kreiraj embed
  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle(`${emoji('tada')} GIVEAWAY - ${prize}`)
    .setDescription(`**Klikni na dugme ispod da se prijlaviš!**`)
    .addFields(
      { name: `${emoji('trophy')} Nagrada`, value: prize, inline: true },
      { name: `${emoji('stats')} Pobednika`, value: winnersCount.toString(), inline: true },
      { name: `${emoji('clock')} Završava`, value: `<t:${Math.floor(endsAt / 1000)}:R>`, inline: true }
    )
    .setFooter({ text: `ID: ${giveawayId}` })
    .setTimestamp();

  const button = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`giveaway_join_${giveawayId}`)
        .setLabel('Prijavi se!')
        .setStyle(ButtonStyle.Success)
        .setEmoji(emoji('tada'))
    );

  const giveawayMessage = await message.channel.send({ embeds: [embed], components: [button] });

  // Sačuvaj giveaway
  const giveaways = await getGiveaways();
  giveaways[giveawayId] = {
    messageId: giveawayMessage.id,
    channelId: message.channel.id,
    guildId: message.guild.id,
    prize,
    winnersCount,
    endsAt,
    participants: [],
    winners: [],
    status: 'ACTIVE'
  };

  await saveGiveaways(giveaways);

  // Post embed
  const postEmbed = new EmbedBuilder()
    .setColor(0x2ECC71)
    .setTitle(`${emoji('success')} Giveaway Kreiran`)
    .addFields(
      { name: 'Nagrada', value: prize, inline: true },
      { name: 'Pobednika', value: winnersCount.toString(), inline: true },
      { name: 'ID', value: giveawayId, inline: true }
    )
    .setTimestamp();

  await message.reply({ embeds: [postEmbed] });

  // Auto-završi nakon vremena
  setTimeout(async () => {
    await selectWinners(giveawayId, message.client);
  }, duration);
}

// ============================================
// commands/giveaway/gend.js
// ============================================
export const meta_gend = {
  name: 'gend',
  description: 'Završi giveaway'
};

export async function execute_gend(message, args) {
  if (!message.member.permissions.has('ManageGuild')) {
    return message.reply(`${emoji('reject')} Nemaš dozvolu!`);
  }

  const giveawayId = args[0];

  if (!giveawayId) {
    return message.reply(`${emoji('error')} Koristi: \`-gend <giveaway_id>\``);
  }

  const giveaways = await getGiveaways();

  if (!giveaways[giveawayId]) {
    return message.reply(`${emoji('error')} Giveaway nije pronađen!`);
  }

  await selectWinners(giveawayId, message.client);

  const embed = new EmbedBuilder()
    .setColor(0x2ECC71)
    .setTitle(`${emoji('success')} Giveaway Završen`)
    .setDescription(`Pobednici su odabrani!`)
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}