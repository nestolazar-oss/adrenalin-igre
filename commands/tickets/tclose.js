import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder
} from "discord.js";
import fs from "fs";

async function fetchMessages(channel) {
  let messages = [];
  let lastId;

  while (true) {
    const fetched = await channel.messages.fetch({
      limit: 100,
      before: lastId
    });

    if (fetched.size === 0) break;

    messages = messages.concat(Array.from(fetched.values()));
    lastId = fetched.last().id;

    if (messages.length >= 2000) break;
  }

  return messages.reverse();
}

function createTXT(channel, messages) {
  let text = `Transcript — ${channel.name}\n`;
  text += `Generated: ${new Date().toLocaleString()}\n\n`;

  for (const msg of messages) {
    const time = msg.createdAt.toLocaleString();
    text += `[${time}] ${msg.author.tag}: ${msg.content}\n`;
  }

  return Buffer.from(text, "utf8");
}

function createHTML(channel, messages) {
  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Transcript ${channel.name}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #0e1116; color: #e6eef3; padding: 20px; }
    .container { max-width: 900px; margin: 0 auto; background: #0b1220; padding: 20px; border-radius: 8px; }
    .msg { padding: 10px; margin: 10px 0; border-left: 3px solid #0084ff; border-radius: 4px; background: rgba(0,0,0,0.2); }
    .time { font-size: 12px; color: #8b949e; }
    .author { font-weight: bold; color: #00ff88; }
    .content { margin-top: 5px; white-space: pre-wrap; }
  </style>
</head>
<body>
<div class="container">
  <h2>Transcript — ${channel.name}</h2>
  <p>Generated: ${new Date().toLocaleString()}</p>
  <hr/>`;

  for (const msg of messages) {
    const time = msg.createdAt.toLocaleString();
    html += `
  <div class="msg">
    <div><span class="time">[${time}]</span> <span class="author">${msg.author.tag}</span></div>
    <div class="content">${msg.content}</div>
  </div>`;
  }

  html += `
</div>
</body>
</html>`;

  return Buffer.from(html, "utf8");
}

export async function handleTclose(client, interaction) {
  if (!interaction.isButton()) return;
  if (!interaction.customId.startsWith("ticket_close")) return;

  const channel = interaction.channel;

  const pathFile = "./tickets.json";
  if (!fs.existsSync(pathFile)) return;

  const tickets = JSON.parse(fs.readFileSync(pathFile, "utf8"));
  const ticketData = tickets[channel.id];

  if (!ticketData) {
    return interaction.reply({
      content: `${emoji("error")} Ovaj kanal nije registrovan kao ticket.`,
      ephemeral: true,
    });
  }

  if (interaction.customId === "ticket_close") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_close_confirm")
        .setLabel("Zatvori")
        .setEmoji(emoji("warning"))
        .setStyle(ButtonStyle.Danger),

      new ButtonBuilder()
        .setCustomId("ticket_close_cancel")
        .setLabel("Otkaži")
        .setEmoji(emoji("success"))
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply({
      content: `${emoji("warning")} Da li želiš zatvoriti ticket?`,
      components: [row],
      ephemeral: true,
    });
  }

  if (interaction.customId === "ticket_close_cancel") {
    return interaction.update({
      content: `${emoji("success")} Zatvaranje otkazano.`,
      components: [],
    });
  }

  if (interaction.customId === "ticket_close_confirm") {
    await interaction.update({
      content: `${emoji("info")} Zatvaram ticket...`,
      components: [],
    });

    const msgs = await fetchMessages(channel);

    const txt = createTXT(channel, msgs);
    const html = createHTML(channel, msgs);

    const txtFile = new AttachmentBuilder(txt, { name: "transcript.txt" });
    const htmlFile = new AttachmentBuilder(html, { name: "transcript.html" });

    const archiveID = process.env.TICKET_ARCHIVE_CHANNEL_ID;
    const archive = archiveID ? interaction.guild.channels.cache.get(archiveID) : null;

    if (archive) {
      const embed = new EmbedBuilder()
        .setColor("#f1c40f")
        .setTitle(`${emoji("stats")} Ticket zatvoren`)
        .addFields(
          { name: "Ticket", value: channel.name, inline: true },
          { name: "Otvorio", value: `<@${ticketData.user}>`, inline: true },
          { name: "Zatvorio", value: `<@${interaction.user.id}>`, inline: true }
        )
        .setTimestamp();

      archive.send({
        embeds: [embed],
        files: [txtFile, htmlFile]
      }).catch(() => {});
    }

    ticketData.closed = true;
    ticketData.closedAt = Date.now();
    fs.writeFileSync(pathFile, JSON.stringify(tickets, null, 2));

    const delRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_delete")
        .setLabel("Obriši ticket")
        .setEmoji(emoji("error"))
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor("#E74C3C")
          .setDescription(`${emoji("warning")} Ticket je zatvoren.\nKlikni ispod za brisanje.`)
      ],
      components: [delRow],
    }).catch(() => {});
  }
}