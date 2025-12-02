// handlers/quoteHandler.js
import { AttachmentBuilder } from 'discord.js';
import { createCanvas, loadImage } from 'canvas';
import fetch from 'node-fetch';

const MENTION_REGEX = /<@!?(\d+)>/;

/* ============================================
   QUOTE IMAGE GENERATOR - QUOTE MARKS GORE
   ============================================ */
async function generateQuoteImage(quotedUserName, quotedUserAvatar, quotedMessage, quotingUserName, quotedUserTag) {
  try {
    const width = 1200;
    const height = 700;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // ===== BACKGROUND - Avatar blurred =====
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    if (quotedUserAvatar) {
      try {
        let imageUrl = quotedUserAvatar;
        imageUrl = imageUrl.replace(/\?size=\d+/, '');
        imageUrl = imageUrl.replace(/\.webp/g, '.png');
        if (!imageUrl.includes('?')) {
          imageUrl += '?size=2048';
        }

        const res = await fetch(imageUrl);
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const img = await loadImage(buffer);

          // Draw scaled avatar as background
          ctx.drawImage(img, -400, -400, width + 800, height + 800);
          
          // Multiple blur-like overlays
          for (let i = 0; i < 3; i++) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(0, 0, width, height);
          }
        }
      } catch (e) {
        console.error('Avatar error:', e.message);
      }
    }

    // ===== DARK OVERLAY =====
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, width, height);

    // ===== GRID/NOISE =====
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 60) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 60) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    // ===== QUOTE MARKS - GORE IZA TEKSTA =====
    ctx.font = 'bold 200px "Georgia", serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.textAlign = 'center';
    const quoteY = 180;
    ctx.fillText('"', width / 2 - 180, quoteY);
    ctx.fillText('"', width / 2 + 180, quoteY);

    // ===== MAIN MESSAGE TEXT - VELIKI BELI =====
    ctx.font = 'bold 60px "Arial", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 35;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;

    // Wrap text
    const maxWidth = width - 200;
    const lineHeight = 85;
    const words = quotedMessage.split(' ');
    let line = '';
    const lines = [];

    for (const word of words) {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && line) {
        lines.push(line.trim());
        line = word + ' ';
      } else {
        line = testLine;
      }
    }
    if (line) lines.push(line.trim());

    const totalTextHeight = lines.length * lineHeight;
    const startY = (height - totalTextHeight) / 2 + 40;

    for (let i = 0; i < Math.min(lines.length, 4); i++) {
      ctx.fillText(lines[i], width / 2, startY + i * lineHeight);
    }

    ctx.shadowBlur = 0;

    // ===== BOTTOM SECTION - User info =====
    const bottomY = startY + Math.min(lines.length, 4) * lineHeight + 60;

    // Separator line with glow
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.2)';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 200, bottomY);
    ctx.lineTo(width / 2 + 200, bottomY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Username - LARGE & WHITE
    ctx.font = 'bold 52px "Arial", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 15;
    ctx.fillText(quotedUserName.toUpperCase(), width / 2, bottomY + 100);
    ctx.shadowBlur = 0;

    // Tag/handle - smaller, gray
    ctx.font = '28px "Arial", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText('@' + (quotedUserTag || quotedUserName).toLowerCase().replace(/\s+/g, '_'), width / 2, bottomY + 150);

    // ===== BOTTOM RIGHT - /adrenalin branding =====
    ctx.font = 'bold 20px "Arial", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'right';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 12;
    ctx.fillText('/' + 'adrenalin', width - 50, height - 45);
    ctx.shadowBlur = 0;

    return canvas.toBuffer('image/png');
  } catch (e) {
    console.error('Quote canvas error:', e);
    return null;
  }
}

/* ============================================
   HANDLE QUOTE REPLIES
   ============================================ */
export async function handleQuoteReplies(message) {
  try {
    if (message.author.bot) return;

    if (!message.reference) return;

    const mentionMatch = message.content.match(MENTION_REGEX);
    if (!mentionMatch) return;

    const mentionedId = mentionMatch[1];
    if (mentionedId !== message.client.user.id) return;

    try {
      const repliedTo = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
      if (!repliedTo || repliedTo.author.bot) return;

      console.log(`✅ Quote from: ${repliedTo.author.username}`);

      const avatarUrl = repliedTo.author.displayAvatarURL?.({ format: 'png', size: 2048 });

      const imageBuffer = await generateQuoteImage(
        repliedTo.author.username,
        avatarUrl,
        repliedTo.content.slice(0, 300),
        message.author.username,
        repliedTo.author.username
      );

      if (imageBuffer) {
        const attachment = new AttachmentBuilder(imageBuffer, { name: 'quote.png' });
        await message.reply({ files: [attachment] }).catch((err) => {
          console.error('Quote send error:', err.message);
        });
      }
    } catch (e) {
      console.error('Quote handler error:', e);
    }
  } catch (e) {
    console.error('handleQuoteReplies error:', e);
  }
}

export default { handleQuoteReplies };