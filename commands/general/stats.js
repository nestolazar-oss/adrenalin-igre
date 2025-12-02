import { createCanvas, loadImage } from 'canvas';
import { getUser } from "../../database/userDB.js";

export const meta = {
    name: 'stats',
    aliases: ['mystats'],
    description: 'Prikaži statistiku korisnika'
};

// ====================================================================
//  MAIN CANVAS FUNCTION
// ====================================================================
async function generateUserStatsCanvas(user, member, guild) {

    // === LOAD USER DATA FROM DB ===
    const dbUser = await getUser(user.id);

    const dailyMessages = dbUser.dailyMessages || {};
    const dailyVoice = dbUser.dailyVoice || {};
    const channelMessages = dbUser.channelMessages || {};

    const lifetimeMessages = dbUser.messages || 0;
    const lifetimeVoice = dbUser.voiceTime || 0;

    // === HELPER: GET SUM OF LAST X DAYS ===
    const getDays = (obj, days) => {
        const now = Date.now();
        const cutoff = now - days * 86400000;

        return Object.entries(obj)
            .filter(([date]) => new Date(date).getTime() >= cutoff)
            .reduce((sum, [, val]) => sum + val, 0);
    };

    // === MESSAGE STATS ===
    const msg1d = getDays(dailyMessages, 1);
    const msg7d = getDays(dailyMessages, 7);
    const msg14d = getDays(dailyMessages, 14);

    // === VOICE STATS (convert to hours) ===
    const voice1d = getDays(dailyVoice, 1) / 3600;
    const voice7d = getDays(dailyVoice, 7) / 3600;
    const voice14d = getDays(dailyVoice, 14) / 3600;

    // === TOP CHANNELS (by message count) ===
    const topChannels = Object.entries(channelMessages)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    // ====================================================================
    //  CANVAS SETUP
    // ====================================================================
    const width = 1200;
    const height = 850;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // === BACKGROUND ===
    ctx.fillStyle = '#0a0e27';
    ctx.fillRect(0, 0, width, height);

    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, '#0f1a3f');
    bgGradient.addColorStop(0.5, '#0a0e27');
    bgGradient.addColorStop(1, '#050812');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = 'rgba(0, 170, 255, 0.04)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= width; i += 60) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
    }
    for (let i = 0; i <= height; i += 60) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
    }

    // Stars
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 80; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = Math.random() * 1.8 + 0.3;
        ctx.globalAlpha = Math.random() * 0.7 + 0.1;

        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ====================================================================
    //  AVATAR
    // ====================================================================
    const avatarSize = 150;
    const avatarX = width / 2;
    const avatarY = 130;

    try {
        const avatarURL = user.displayAvatarURL({ extension: 'png', size: 256 });
        const avatarImage = await loadImage(avatarURL);

        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(
            avatarImage,
            avatarX - avatarSize / 2,
            avatarY - avatarSize / 2,
            avatarSize,
            avatarSize
        );
        ctx.restore();
    } catch (e) {
        ctx.fillStyle = '#00eaff';
        ctx.font = 'bold 70px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👤', avatarX, avatarY);
    }

    ctx.fillStyle = '#00eaff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(user.username, width / 2, avatarY + avatarSize / 2 + 50);

    // ====================================================================
    //  TOP INFO BOXES
    // ====================================================================
    const topBoxY = 300;
    const boxHeight = 100;
    const boxWidth = (width - 120) / 3;

    drawDarkGlowBox(ctx, 40, topBoxY, boxWidth, boxHeight, 'CREATED ON', formatDate(user.createdAt), '#00eaff');
    drawDarkGlowBox(ctx, 40 + boxWidth + 30, topBoxY, boxWidth, boxHeight, 'JOINED ON', formatDate(member?.joinedAt), '#3cf2ff');

    drawDarkGlowBox(
        ctx,
        40 + (boxWidth + 30) * 2,
        topBoxY,
        boxWidth,
        boxHeight,
        'SERVER RANKS',
        'Messages: #?  |  Voice: #?',
        '#5ecbff',
        true
    );

    // ====================================================================
    //  ACTIVITY TABLE
    // ====================================================================
    const secondRowY = 430;
    const activityBoxWidth = (width - 110) / 2;
    const activityHeight = 200;

    drawActivityTableBox(
        ctx,
        secondRowY,
        activityBoxWidth,
        activityHeight,
        msg1d, msg7d, msg14d,
        voice1d, voice7d, voice14d,
        lifetimeMessages,
        lifetimeVoice
    );

    // ====================================================================
    //  TOP CHANNELS
    // ====================================================================
    drawTopChannelsBox(
        ctx,
        40,
        secondRowY + activityHeight + 20,
        activityBoxWidth,
        160,
        topChannels,
        guild
    );

    return canvas.toBuffer('image/png');
}

// ====================================================================
//  DRAW FUNCTIONS
// ====================================================================

function drawDarkGlowBox(ctx, x, y, width, height, label, value, glowColor, isRanks = false) {
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, width, height);

    ctx.fillStyle = 'rgba(5, 8, 20, 0.9)';
    ctx.fillRect(x + 2.5, y + 2.5, width - 5, height - 5);

    ctx.fillStyle = '#5ecbff';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 20, y + 32);

    ctx.fillStyle = isRanks ? '#00eaff' : '#3cf2ff';
    ctx.font = isRanks ? 'bold 16px Arial' : 'bold 32px Arial';
    ctx.fillText(value, x + 20, y + (isRanks ? 72 : 78));
}

function drawActivityTableBox(
    ctx,
    y,
    width,
    height,
    msg1d, msg7d, msg14d,
    voice1d, voice7d, voice14d,
    lifeMsgs,
    lifeVoice
) {
    const x = 40;

    ctx.strokeStyle = '#3cf2ff';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, width, height);

    ctx.fillStyle = 'rgba(5, 8, 20, 0.9)';
    ctx.fillRect(x + 2.5, y + 2.5, width - 5, height - 5);

    ctx.fillStyle = '#00eaff';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('+ ACTIVITY +', x + 25, y + 35);

    const headers = ['TYPE', '1D', '7D', '14D', 'LIFE'];
    const colX = [x + 25, x + 100, x + 165, x + 235, x + 310];

    ctx.fillStyle = '#5ecbff';
    ctx.font = 'bold 12px Arial';

    headers.forEach((h, i) => ctx.fillText(h, colX[i], y + 75));

    // === Messages row ===
    ctx.fillStyle = '#00eaff';
    ctx.font = 'bold 14px Arial';
    const row1Y = y + 110;
    ctx.fillText('Messages', x + 25, row1Y);

    ctx.fillStyle = '#3cf2ff';
    ctx.font = '13px Arial';
    ctx.fillText(msg1d.toString(), colX[1], row1Y);
    ctx.fillText(msg7d.toString(), colX[2], row1Y);
    ctx.fillText(msg14d.toString(), colX[3], row1Y);
    ctx.fillText(lifeMsgs.toString(), colX[4], row1Y);

    // === Voice row ===
    const row2Y = y + 160;
    ctx.fillStyle = '#00eaff';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('Voice', x + 25, row2Y);

    ctx.fillStyle = '#3cf2ff';
    ctx.font = '13px Arial';

    ctx.fillText(voice1d.toFixed(1) + "h", colX[1], row2Y);
    ctx.fillText(voice7d.toFixed(1) + "h", colX[2], row2Y);
    ctx.fillText(voice14d.toFixed(1) + "h", colX[3], row2Y);
    ctx.fillText((lifeVoice / 3600).toFixed(1) + "h", colX[4], row2Y);
}

function drawTopChannelsBox(ctx, x, y, width, height, topChannels, guild) {
    ctx.strokeStyle = '#3cf2ff';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, width, height);

    ctx.fillStyle = 'rgba(5, 8, 20, 0.9)';
    ctx.fillRect(x + 2.5, y + 2.5, width - 5, height - 5);

    ctx.fillStyle = '#00eaff';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('+ TOP CHANNELS (14D) +', x + 25, y + 35);

    ctx.fillStyle = '#00eaff';
    ctx.font = '12px Arial';

    if (topChannels.length === 0) {
        ctx.fillStyle = '#5ecbff';
        ctx.fillText('No text activity', x + 25, y + 95);
        return;
    }

    let offset = 0;
    for (const [channelId, count] of topChannels) {
        const channel = guild.channels.cache.get(channelId);
        const name = channel ? "#" + channel.name : "Unknown";

        ctx.fillStyle = '#00eaff';
        ctx.fillText(`${name} — ${count} msgs`, x + 25, y + 95 + offset);
        offset += 20;
    }
}

// ====================================================================
// HELPERS
// ====================================================================
function formatDate(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
    });
}

// ====================================================================
// COMMAND EXECUTION
// ====================================================================
export async function execute(message, args) {
    let user = message.author;

    if (args.length > 0) {
        const target =
            message.mentions.users.first() ||
            (await message.client.users.fetch(args[0]).catch(() => null));

        if (target) user = target;
        else return message.reply("❌ Korisnik nije pronađen!");
    }

    const member = message.guild.members.cache.get(user.id);

    const img = await generateUserStatsCanvas(
        user,
        member,
        message.guild // FIX for ctx.guild bug
    );

    return message.reply({
        files: [{ attachment: img, name: 'userstats.png' }]
    });
}

export default { meta, execute };
