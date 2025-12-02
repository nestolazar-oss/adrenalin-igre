// utils/word-canvas.js
import { createCanvas, loadImage, registerFont } from "canvas";
import path from "path";
import { fileURLToPath } from "url";
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fontsPath = path.join(__dirname, "../assets/fonts");

try {
  registerFont(path.join(fontsPath, "Montserrat-Bold.ttf"), { family: "Montserrat" });
  registerFont(path.join(fontsPath, "Montserrat-Regular.ttf"), { family: "Montserrat-Regular" });
} catch (e) { /* ignore */ }

/* ============================================
   AVATAR LOADER
   ============================================ */
async function loadAvatarImage(url) {
  try {
    if (!url) return null;
    
    let imageUrl = url;
    imageUrl = imageUrl.replace(/\?size=\d+/, '');
    imageUrl = imageUrl.replace(/\.webp/g, '.png');
    
    if (!imageUrl.includes('?')) {
      imageUrl += '?size=256';
    } else {
      imageUrl += '&size=256';
    }
    
    console.log('🖼️ Loading avatar from:', imageUrl);
    
    const res = await fetch(imageUrl);
    if (!res.ok) {
      console.error(`Avatar fetch failed: HTTP ${res.status}`);
      return null;
    }
    
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const img = await loadImage(buffer);
    
    console.log('✅ Avatar loaded successfully');
    return img;
  } catch (e) {
    console.error('❌ Avatar load error:', e.message);
    return null;
  }
}

/* ============================================
   ROUND START CANVAS
   ============================================ */
export async function roundStartCanvas(word, length, seconds, difficulty) {
  try {
    const width = 800;
    const height = 350;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#0a0e27');
    grad.addColorStop(0.5, '#1a1f4d');
    grad.addColorStop(1, '#0a0e27');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Grid pattern
    ctx.strokeStyle = 'rgba(0,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    // Particles
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 1.5 + 0.5;
      ctx.fillRect(x, y, size, size);
    }

    // Title
    ctx.font = 'bold 48px "Arial", sans-serif';
    ctx.fillStyle = '#00FFFF';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 255, 255, 0.5)';
    ctx.shadowBlur = 15;
    ctx.fillText('NOVA RUNDA', width / 2, 60);
    ctx.shadowBlur = 0;

    // Main word
    ctx.font = 'bold 80px "Arial", sans-serif';
    ctx.fillStyle = '#00FFFF';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 100, 200, 0.6)';
    ctx.shadowBlur = 20;
    ctx.fillText(String(word || "").toUpperCase(), width / 2, 160);
    ctx.shadowBlur = 0;

    // Info
    ctx.font = '18px "Arial", sans-serif';
    ctx.fillStyle = '#AAAAAA';
    ctx.textAlign = 'center';
    ctx.fillText(`📏 ${length} slova | ⏱️ ${seconds}s`, width / 2, 215);

    // Difficulty badge
    const diffColor = difficulty === 'LAKO' ? '#00FF88' : difficulty === 'SREDNJE' ? '#FFD700' : '#FF4444';
    const diffText = difficulty === 'LAKO' ? 'LAKO' : difficulty === 'SREDNJE' ? 'SREDNJE' : 'TESKO';

    ctx.fillStyle = `rgba(${difficulty === 'LAKO' ? '0,255,136' : difficulty === 'SREDNJE' ? '255,215,0' : '255,68,68'},0.15)`;
    ctx.fillRect(width / 2 - 70, 245, 140, 45);

    ctx.strokeStyle = diffColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(width / 2 - 70, 245, 140, 45);

    ctx.font = 'bold 18px "Arial", sans-serif';
    ctx.fillStyle = diffColor;
    ctx.fillText(diffText, width / 2, 275);

    // Footer
    ctx.font = '14px "Arial", sans-serif';
    ctx.fillStyle = '#888888';
    ctx.fillText('discord.gg/adrenalin', width / 2, height - 15);

    return canvas.toBuffer('image/png');
  } catch (e) {
    console.error('Round canvas error:', e);
    return null;
  }
}

/* ============================================
   VICTORY CANVAS
   ============================================ */
export async function victoryCanvas(winnerName, time, avatarURL, word, difficulty = "LAKO") {
  try {
    const width = 800;
    const height = 350;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#0a0e27');
    grad.addColorStop(0.5, '#1a1f4d');
    grad.addColorStop(1, '#0a0e27');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Grid pattern
    ctx.strokeStyle = 'rgba(0,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    // Particles
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 2 + 0.5;
      ctx.fillRect(x, y, size, size);
    }

    // ===== AVATAR SECTION (LEFT SIDE) =====
    const avatarX = 170;
    const avatarY = 175;
    const avatarRadius = 100;

    // Outer glow circles
    ctx.fillStyle = 'rgba(0,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarRadius + 40, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(100,200,255,0.08)';
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarRadius + 20, 0, Math.PI * 2);
    ctx.fill();

    // Avatar border with glow
    ctx.strokeStyle = '#00FFFF';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#00FFFF';
    ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw avatar image
    if (avatarURL) {
      try {
        const img = await loadAvatarImage(avatarURL);
        if (img) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(avatarX, avatarY, avatarRadius - 5, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, avatarX - (avatarRadius - 5), avatarY - (avatarRadius - 5), (avatarRadius - 5) * 2, (avatarRadius - 5) * 2);
          ctx.restore();
        }
      } catch (e) {
        console.error('Avatar render error:', e.message);
        // Fallback
        ctx.fillStyle = 'rgba(0, 150, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, avatarRadius - 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ===== TEXT SECTION (RIGHT SIDE) =====
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 20;
    ctx.textAlign = 'left';

    let xText = 340;
    let yStart = 65;
    let lineGap = 85;

    // POBEDNIK
    ctx.font = '24px "Arial", sans-serif';
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText('POBEDNIK:', xText, yStart);

    ctx.font = 'bold 28px "Arial", sans-serif';
    ctx.fillStyle = '#00FFFF';
    ctx.shadowColor = 'rgba(0, 255, 255, 0.5)';
    ctx.shadowBlur = 15;
    ctx.fillText(String(winnerName || "").toUpperCase(), xText, yStart + 32);
    ctx.shadowBlur = 0;

    // VREME
    yStart += lineGap;
    ctx.font = '24px "Arial", sans-serif';
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText('VREME:', xText, yStart);

    ctx.font = 'bold 28px "Arial", sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
    ctx.shadowBlur = 15;
    ctx.fillText(`${time}s`, xText, yStart + 32);
    ctx.shadowBlur = 0;

    // REC
    yStart += lineGap;
    ctx.font = '24px "Arial", sans-serif';
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText('REC:', xText, yStart);

    ctx.font = 'bold 28px "Arial", sans-serif';
    ctx.fillStyle = '#00FF88';
    ctx.shadowColor = 'rgba(0, 255, 136, 0.5)';
    ctx.shadowBlur = 15;
    ctx.fillText(String(word || "").toUpperCase(), xText, yStart + 32);
    ctx.shadowBlur = 0;

    // DIFFICULTY BADGE (TOP RIGHT)
    const badgeX = width - 85;
    const badgeY = 30;

    const diffColor = difficulty === 'easy' || difficulty === 'Lako' ? '#00FF88' : difficulty === 'medium' || difficulty === 'Srednje' ? '#FFD700' : '#FF4444';
    const diffText = difficulty === 'easy' || difficulty === 'Lako' ? 'LAKO' : difficulty === 'medium' || difficulty === 'Srednje' ? 'SREDNJE' : 'TESKO';

    ctx.fillStyle = `rgba(${difficulty === 'easy' || difficulty === 'Lako' ? '0,255,136' : difficulty === 'medium' || difficulty === 'Srednje' ? '255,215,0' : '255,68,68'},0.15)`;
    ctx.fillRect(badgeX - 60, badgeY - 20, 120, 40);

    ctx.strokeStyle = diffColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(badgeX - 60, badgeY - 20, 120, 40);

    ctx.font = 'bold 16px "Arial", sans-serif';
    ctx.fillStyle = diffColor;
    ctx.textAlign = 'center';
    ctx.fillText(diffText, badgeX, badgeY + 5);

    // FOOTER
    ctx.font = '16px "Arial", sans-serif';
    ctx.fillStyle = '#888888';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.fillText('discord.gg/adrenalin', width / 2, height - 20);
    ctx.shadowBlur = 0;

    return canvas.toBuffer('image/png');
  } catch (e) {
    console.error('Victory canvas error:', e);
    return null;
  }
}

export const generateWordVictoryImage = victoryCanvas;
export const generateWordRoundImage = roundStartCanvas;