import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { emoji } from '../../utils/emojis.js';

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
    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`${emoji('reject')} Pristup odbijen`)
      .setDescription('Nemaš dozvolu!')
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  const durationStr = args[0];
  const prize = args.slice(1).join(' ');

  if (!durationStr || !prize) {
    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`${emoji('error')} Greška`)
      .setDescription(`Koristi: \`-gstart <10m|1h|1d> <nagrada>\``)
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  // Parse vremena
  const match = durationStr.match(/(\d+)([smhd])/);
  if (!match) {
    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`${emoji('error')} Greška`)
      .setDescription(`Format: \`10m|1h|1d\``)
      .setTimestamp();
    return message.reply({ embeds: [embed] });
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
      { name: `${emoji('stats')} Pobednika`, value: '1', inline: true },
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
    winnersCount: 1,
    endsAt,
    participants: [],
    winners: [],
    status: 'ACTIVE',
    createdBy: message.author.tag,
    createdAt: new Date().toISOString()
  };

  await saveGiveaways(giveaways);

  // Post confirmation embed
  const postEmbed = new EmbedBuilder()
    .setColor(0x2ECC71)
    .setTitle(`${emoji('success')} Giveaway Kreiran`)
    .addFields(
      { name: 'Nagrada', value: prize, inline: true },
      { name: 'Trajanje', value: durationStr, inline: true },
      { name: 'ID', value: giveawayId, inline: true }
    )
    .setTimestamp();

  await message.reply({ embeds: [postEmbed] });

  // Auto-završi nakon vremena
  setTimeout(async () => {
    await selectWinners(giveawayId, message.client);
  }, duration);
}

async function selectWinners(giveawayId, client) {
  try {
    const giveaways = await getGiveaways();
    const giveaway = giveaways[giveawayId];

    if (!giveaway) return;

    giveaway.status = 'ENDED';

    if (giveaway.participants.length === 0) {
      // Nema učesnika
      const channel = client.channels.cache.get(giveaway.channelId);
      if (channel) {
        const embed = new EmbedBuilder()
          .setColor(0xE74C3C)
          .setTitle(`${emoji('error')} Giveaway Završen`)
          .setDescription(`Nema učesnika! Nagrada: **${giveaway.prize}**`)
          .setTimestamp();

        await channel.send({ embeds: [embed] }).catch(() => {});
      }
    } else {
      // Odaberi pobednika
      const winner = giveaway.participants[Math.floor(Math.random() * giveaway.participants.length)];
      giveaway.winners = [winner];

      const channel = client.channels.cache.get(giveaway.channelId);
      if (channel) {
        const embed = new EmbedBuilder()
          .setColor(0x2ECC71)
          .setTitle(`${emoji('trophy')} Giveaway Završen!`)
          .setDescription(`Pobednik: <@${winner}>\nNagrada: **${giveaway.prize}**`)
          .addFields(
            { name: `${emoji('stats')} Učesnika`, value: giveaway.participants.length.toString(), inline: true }
          )
          .setTimestamp();

        await channel.send({ embeds: [embed] }).catch(() => {});
      }

      // Pošalji DM pobedniku
      try {
        const user = await client.users.fetch(winner);
        const dmEmbed = new EmbedBuilder()
          .setColor(0x2ECC71)
          .setTitle(`${emoji('trophy')} ČESTITAM! Pobedio si Giveaway!`)
          .setDescription(`Nagrada: **${giveaway.prize}**`)
          .addFields(
            { name: 'Info', value: 'Odgovori sa "YES" u roku od 10 sekundi da potvrdis!', inline: false }
          )
          .setTimestamp();

        await user.send({ embeds: [dmEmbed] });
      } catch (e) {
        console.error('DM error:', e);
      }
    }

    await saveGiveaways(giveaways);
  } catch (e) {
    console.error('selectWinners error:', e);
  }
}