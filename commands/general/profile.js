import { createCanvas, loadImage } from 'canvas';
import { initUser } from '../../database/userDB.js';
import { emoji } from '../../utils/emojis.js';

export const meta = {
  name: 'profile',
  aliases: ['p', 'prof'],
  description: 'Prikaži profil korisnika'
};

async function loadAvatar(url) {
  try {
    const pngUrl = url.replace(/\?size=\d+/, '').replace(/\.webp/, '.png') + '?size=256';
    const res = await fetch(pngUrl);
    if (!res.ok) throw new Error('Avatar HTTP ' + res.status);
    const buffer = Buffer.from(await res.arrayBuffer());
    return await loadImage(buffer);
  } catch (e) {
    console.error('Avatar load error:', e.message);
    return null;
  }
}

async function generateProfileCanvas(member, userData) {
  const width = 900;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#09111f');
  bg.addColorStop(1, '#182b45');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Avatar circle
  const avatarX = 180;
  const avatarY = 200;
  const avatarR = 120;
  ctx.strokeStyle = '#00c8ff';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
  ctx.stroke();

  // Avatar load
  const avatar = await loadAvatar(member.user.displayAvatarURL({ size: 256, dynamic: true }));
  if (avatar) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarR - 5, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar, avatarX - (avatarR - 5), avatarY - (avatarR - 5), (avatarR - 5) * 2, (avatarR - 5) * 2);
    ctx.restore();
  }

  // Text section
  let textX = 360;
  let textY = 80;
  let gap = 55;

  ctx.fillStyle = '#b0c7ff';
  ctx.font = 'bold 38px Arial';
  ctx.fillText(member.user.username, textX, textY);

  ctx.font = '24px Arial';
  ctx.fillStyle = '#9bb2d7';
  
  textY += gap;
  ctx.fillText(`Tag: ${member.user.tag}`, textX, textY);
  
  textY += gap;
  ctx.fillText(`ID: ${member.id}`, textX, textY);
  
  textY += gap;
  ctx.fillText(`Pridružio se: ${new Date(member.joinedTimestamp).toLocaleDateString()}`, textX, textY);
  
  textY += gap;
  ctx.fillText(`Novac: $${userData.cash.toLocaleString()}`, textX, textY);
  
  textY += gap;
  ctx.fillText(`Banka: $${userData.bank.toLocaleString()}`, textX, textY);
  
  textY += gap;
  ctx.fillText(`Status: ${member.nickname || 'Nema nicknamea'}`, textX, textY);

  return canvas.toBuffer('image/png');
}

export async function execute(message, args) {
  const target = message.mentions.users.first() || message.author;
  const member = await message.guild.members.fetch(target.id).catch(() => null);

  if (!member) {
    return message.reply(`${emoji('error')} Korisnik nije pronađen!`);
  }

  const userData = initUser(target.id);
  const img = await generateProfileCanvas(member, userData);

  return message.reply({ files: [{ attachment: img, name: 'profile.png' }] });
}

export default { meta, execute };