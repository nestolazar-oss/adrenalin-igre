import { createCanvas } from "canvas";

// Generate stats canvas
export async function generateStatsCanvas(guild, botPing) {
  const width = 900;
  const height = 420;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Background
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#0b1321");
  bg.addColorStop(1, "#1a2947");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = "#00d4ff";
  ctx.font = "bold 42px Arial";
  ctx.fillText("SERVER STATISTIKA", 40, 70);

  // White panel
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillRect(30, 100, width - 60, height - 150);

  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 2;
  ctx.strokeRect(30, 100, width - 60, height - 150);

  // Stats values
  let x = 70;
  let y = 150;
  let gap = 55;

  const bots = guild.members.cache.filter(m => m.user.bot).size;
  const humans = guild.memberCount - bots;
  const channelsText = guild.channels.cache.filter(c => c.isTextBased()).size;
  const channelsVoice = guild.channels.cache.filter(c => c.isVoiceBased()).size;

  const pairs = [
    ["Ukupno članova", guild.memberCount],
    ["Botovi", bots],
    ["Ljudi", humans],
    ["Tekst kanali", channelsText],
    ["Voice kanali", channelsVoice],
    ["Roles", guild.roles.cache.size],
    ["Bot Ping", `${botPing}ms`]
  ];

  ctx.font = "28px Arial";
  ctx.fillStyle = "#b5c8e6";

  for (const [label, value] of pairs) {
    ctx.fillText(`${label}:`, x, y);
    ctx.fillStyle = "#00e0ff";
    ctx.fillText(value.toString(), x + 300, y);
    ctx.fillStyle = "#b5c8e6";
    y += gap;
  }

  return canvas.toBuffer("image/png");
}

// Command wrapper
export async function execute_stats(message, args) {
  const guild = message.guild;
  const img = await generateStatsCanvas(guild, message.client.ws.ping);

  return message.reply({ files: [{ attachment: img, name: "stats.png" }] });
}
