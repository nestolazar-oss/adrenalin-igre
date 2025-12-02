import { createCanvas, loadImage } from 'canvas';
import { initUser } from '../../database/userDB.js';
import { emoji } from '../../utils/emojis.js';

export const meta = {
  name: 'messages',
  aliases: ['msg'],
  description: 'Prikaži statistiku poruka'
};

async function loadAvatar(url) {
  try {
    const pngUrl = url.replace(/\.webp/, '.png');
    const res = await fetch(pngUrl);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return await loadImage(buf);
  } catch {
    return null;
  }
}

async function generateMessagesCard(user, count) {
  const width = 700;
  const height = 250;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#0a0d24');
  gradient.addColorStop(1, '#1b234d');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const avatar = await loadAvatar(user.displayAvatarURL({ size: 256 }));
  if (avatar) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(125, 125, 90, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar, 35, 35, 180, 180);
    ctx.restore();
  }

  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(250, 40, 400, 170);
  ctx.strokeStyle = '#00c3ff';
  ctx.lineWidth = 3;
  ctx.strokeRect(250, 40, 400, 170);

  ctx.fillStyle = '#07e8ff';
  ctx.font = 'bold 32px Arial';
  ctx.fillText('STATISTIKA PORUKA', 260, 80);

  ctx.fillStyle = '#ffffff';
  ctx.font = '24px Arial';
  ctx.fillText('Korisnik:', 260, 125);
  ctx.fillText('Poruke:', 260, 170);

  ctx.fillStyle = '#00e6a8';
  ctx.font = 'bold 26px Arial';
  ctx.fillText(user.tag, 370, 125);

  ctx.fillStyle = '#ffd447';
  ctx.font = 'bold 30px Arial';
  ctx.fillText(count.toString(), 370, 170);

  return canvas.toBuffer('image/png');
}

export async function execute(message, args) {
  const target = message.mentions.users.first() || message.author;
  const data = initUser(target.id);
  const total = data.messages || 0;

  const buffer = await generateMessagesCard(target, total);

  if (!buffer) {
    return message.reply(`${emoji('error')} Greška pri generisanju slike.`);
  }

  return message.reply({ files: [{ attachment: buffer, name: 'messages.png' }] });
}

export default { meta, execute };