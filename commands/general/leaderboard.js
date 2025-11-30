import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from 'discord.js';
import { getAllUsers } from '../../utils/db.js';
import { createCanvas } from 'canvas';

const ITEMS_PER_PAGE = 10;

export const meta = {
  name: 'leaderboard',
  aliases: ['lb', 'top'],
  description: 'Prikaži leaderboard'
};

export async function execute(message, args) {
  const type = args[0]?.toLowerCase() || 'balance';
  const validTypes = ['balance', 'levels', 'messages', 'invites', 'voice'];

  if (!validTypes.includes(type)) {
    return message.reply(`${emoji('error')} Koristi: \`-lb <${validTypes.join('|')}>\``);
  }

  const allUsers = getAllUsers();
  const guild = message.guild;

  let sorted = [];

  if (type === 'balance') {
    sorted = Object.entries(allUsers)
      .map(([id, data]) => ({ id, value: (data.cash || 0) + (data.bank || 0) }))
      .sort((a, b) => b.value - a.value);
  } else if (type === 'levels') {
    sorted = Object.entries(allUsers)
      .map(([id, data]) => ({ id, value: data.level || 0 }))
      .sort((a, b) => b.value - a.value);
  } else if (type === 'messages') {
    sorted = Object.entries(allUsers)
      .map(([id, data]) => ({ id, value: data.messages || 0 }))
      .sort((a, b) => b.value - a.value);
  } else if (type === 'invites') {
    sorted = Object.entries(allUsers)
      .map(([id, data]) => ({ id, value: data.invites || 0 }))
      .sort((a, b) => b.value - a.value);
  } else if (type === 'voice') {
    sorted = Object.entries(allUsers)
      .map(([id, data]) => ({ id, value: Math.floor((data.voiceTime || 0) / 3600) }))
      .sort((a, b) => b.value - a.value);
  }

  if (sorted.length === 0) {
    return message.reply(`${emoji('error')} Nema korisnika na leaderboardu!`);
  }

  const page = Math.max(0, Math.min(parseInt(args[1] || 1) - 1, Math.ceil(sorted.length / ITEMS_PER_PAGE) - 1));
  const start = page * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const pageUsers = sorted.slice(start, end);

  // Canvas
  const canvas = createCanvas(900, 600);
  const ctx = canvas.getContext('2d');

  // Background
  const grad = ctx.createLinearGradient(0, 0, 900, 600);
  grad.addColorStop(0, '#0a0e27');
  grad.addColorStop(1, '#1a1f4d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 900, 600);

  // Grid
  ctx.strokeStyle = 'rgba(0,255,255,0.1)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 900; i += 50) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 600);
    ctx.stroke();
  }

  // Title
  ctx.font = 'bold 40px Arial';
  ctx.fillStyle = '#00FFFF';
  ctx.shadowColor = 'rgba(0, 255, 255, 0.5)';
  ctx.shadowBlur = 20;
  ctx.textAlign = 'center';
  ctx.fillText(`🏆 LEADERBOARD - ${type.toUpperCase()}`, 450, 50);
  ctx.shadowBlur = 0;

  // Entries
  ctx.font = '20px Arial';
  ctx.textAlign = 'left';
  let yPos = 100;

  for (let i = 0; i < pageUsers.length; i++) {
    const entry = pageUsers[i];
    const rank = start + i + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;

    ctx.fillStyle = rank <= 3 ? '#FFD700' : '#AAAAAA';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(`${medal}`, 30, yPos);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '18px Arial';
    ctx.fillText(`${entry.id}`, 120, yPos);
    
    ctx.fillStyle = '#00FF88';
    ctx.font = 'bold 20px Arial';
    const valueText = type === 'voice' ? `${entry.value}h` : entry.value.toLocaleString();
    ctx.textAlign = 'right';
    ctx.fillText(valueText, 850, yPos);
    ctx.textAlign = 'left';

    yPos += 50;
  }

  // Footer
  ctx.font = '14px Arial';
  ctx.fillStyle = '#888888';
  ctx.textAlign = 'center';
  ctx.fillText(`Stranica ${page + 1} | discord.gg/adrenalin`, 450, 580);

  const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'leaderboard.png' });

  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle(`🏆 ${guild.name} - ${type.toUpperCase()} Leaderboard`)
    .setImage('attachment://leaderboard.png')
    .setFooter({ text: `Stranica ${page + 1} od ${Math.ceil(sorted.length / ITEMS_PER_PAGE)}` })
    .setTimestamp();

  return message.reply({ embeds: [embed], files: [attachment] });
}
