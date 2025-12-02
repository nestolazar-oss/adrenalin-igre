import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder
} from 'discord.js';
import { createCanvas, loadImage } from 'canvas';
import { getAllUsers } from '../database/userDB.js';

const ITEMS_PER_PAGE = 10;

export async function handleLeaderboardButton(interaction) {
  if (!interaction.isButton()) return;

  const raw = interaction.customId || '';

  // NEW FORMAT: lb_<type>_<action>_<page>
  if (raw.startsWith('lb_')) {
    const parts = raw.split('_');
    // ['lb', type, action, page]

    const type = parts[1] || 'balance';
    const action = parts[2] || 'next';
    const pageNum = parseInt(parts[3]) || 0;

    let finalPage = pageNum;

    try {
      await interaction.deferUpdate().catch(() => {});

      const payload = await renderLeaderboard(
        interaction,
        [type, finalPage],
        true
      );

      if (payload && interaction.message) {
        await interaction.message
          .edit({
            embeds: payload.embeds,
            files: payload.files,
            components: payload.components
          })
          .catch(() => {});
      }
    } catch (e) {
      console.error('LB Interaction error:', e);
      if (!interaction.replied && !interaction.deferred) {
        await interaction
          .reply({
            content: '❌ Greška u leaderboard interakciji.',
            ephemeral: true
          })
          .catch(() => {});
      }
    }

    return;
  }
}

/* ----------------------------------------------------------
   RENDER LEADERBOARD (MESSAGE OR INTERACTION)
----------------------------------------------------------- */
export async function renderLeaderboard(ctx, args, isInteraction) {
  const type = (args?.[0] || 'balance').toLowerCase();
  const valid = ['balance', 'levels', 'messages', 'invites', 'voice'];

  if (!valid.includes(type)) {
    const err = `❌ Koristi: -lb <${valid.join('|')}>`;
    if (isInteraction) return { embeds: [new EmbedBuilder().setDescription(err)] };
    return ctx.reply(err);
  }

  const allUsers = getAllUsers();
  let sorted = [];

  switch (type) {
    case 'balance':
      sorted = Object.entries(allUsers)
        .map(([id, d]) => ({
          id,
          value: (d.cash || 0) + (d.bank || 0)
        }))
        .sort((a, b) => b.value - a.value);
      break;

    case 'levels':
      sorted = sortBy(allUsers, 'level');
      break;

    case 'messages':
      sorted = sortBy(allUsers, 'messages');
      break;

    case 'invites':
      sorted = sortBy(allUsers, 'invites');
      break;

    case 'voice':
      sorted = Object.entries(allUsers)
        .map(([id, d]) => ({
          id,
          value: Math.floor((d.voiceTime || 0) / 3600)
        }))
        .sort((a, b) => b.value - a.value);
      break;
  }

  if (!sorted.length) {
    const err = '❌ Nema podataka!';
    if (isInteraction) return { embeds: [new EmbedBuilder().setDescription(err)] };
    return ctx.reply(err);
  }

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));

  let page = Number(args?.[1]) || 0;
  if (page < 0) page = 0;
  if (page >= totalPages) page = totalPages - 1;

  const start = page * ITEMS_PER_PAGE;
  const pageUsers = sorted.slice(start, start + ITEMS_PER_PAGE);

  /* ----------------------------------------------------------
     DRAW CANVAS
  ----------------------------------------------------------- */
  const canvas = createCanvas(1000, 700);
  const c = canvas.getContext('2d');

  c.fillStyle = '#0A0F25';
  c.fillRect(0, 0, 1000, 700);

  c.font = 'bold 42px Arial';
  c.fillStyle = '#00FFFF';
  c.textAlign = 'center';
  c.fillText(`🏆 LEADERBOARD — ${type.toUpperCase()}`, 500, 70);

  let y = 150;

  for (let i = 0; i < pageUsers.length; i++) {
    const entry = pageUsers[i];
    const rank = start + i + 1;

    let user;
    try {
      user = await ctx.client.users.fetch(entry.id);
    } catch {
      continue;
    }

    c.fillStyle = 'rgba(255,255,255,0.05)';
    c.fillRect(80, y - 40, 840, 75);

    try {
      const avatar = await loadImage(
        user.displayAvatarURL({
          extension: 'png',
          size: 128
        })
      );

      c.save();
      c.beginPath();
      c.arc(140, y, 30, 0, Math.PI * 2);
      c.clip();
      c.drawImage(avatar, 110, y - 30, 60, 60);
      c.restore();
    } catch {}

    c.fillStyle = '#00FFFF';
    c.font = 'bold 26px Arial';
    c.textAlign = 'left';
    c.fillText(`#${rank}`, 210, y + 10);

    c.fillStyle = '#FFFFFF';
    c.font = 'bold 24px Arial';
    c.fillText(user.username, 280, y + 10);

    c.fillStyle = '#00FF99';
    c.textAlign = 'right';
    const val =
      type === 'voice' ? `${entry.value}h` : entry.value.toLocaleString();
    c.fillText(val, 900, y + 10);

    y += 80;
  }

  c.fillStyle = '#888';
  c.textAlign = 'center';
  c.font = '18px Arial';
  c.fillText(`Stranica ${page + 1} / ${totalPages}`, 500, 660);

  const attachment = new AttachmentBuilder(canvas.toBuffer(), {
    name: 'leaderboard.png'
  });

  /* ----------------------------------------------------------
     UNIQUE BUTTONS — NEVER DUPLICATE IDs
  ----------------------------------------------------------- */
  const firstPage = 0;
  const prevPage = Math.max(0, page - 1);
  const nextPage = Math.min(totalPages - 1, page + 1);
  const lastPage = totalPages - 1;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`lb_${type}_first_${firstPage}`)
      .setStyle(ButtonStyle.Primary)
      .setLabel('⏮ First')
      .setDisabled(page === 0),

    new ButtonBuilder()
      .setCustomId(`lb_${type}_prev_${prevPage}`)
      .setStyle(ButtonStyle.Secondary)
      .setLabel('◀ Prev')
      .setDisabled(page === 0),

    new ButtonBuilder()
      .setCustomId(`lb_${type}_next_${nextPage}`)
      .setStyle(ButtonStyle.Secondary)
      .setLabel('Next ▶')
      .setDisabled(page === lastPage),

    new ButtonBuilder()
      .setCustomId(`lb_${type}_last_${lastPage}`)
      .setStyle(ButtonStyle.Primary)
      .setLabel('Last ⏭')
      .setDisabled(page === lastPage)
  );

  const embed = new EmbedBuilder()
    .setColor(0x00ffff)
    .setTitle(`🏆 ${ctx.guild?.name || 'Server'} — ${type.toUpperCase()} TOP`)
    .setImage('attachment://leaderboard.png')
    .setFooter({ text: `Stranica ${page + 1} / ${totalPages}` });

  const payload = {
    embeds: [embed],
    files: [attachment],
    components: [row]
  };

  if (isInteraction) return payload;

  return ctx.reply(payload);
}

/* ----------------------------------------------------------
   UTILS
----------------------------------------------------------- */
function sortBy(obj, key) {
  return Object.entries(obj)
    .map(([id, d]) => ({
      id,
      value: d[key] || 0
    }))
    .sort((a, b) => b.value - a.value);
}

export default {
  handleLeaderboardButton,
  renderLeaderboard
};