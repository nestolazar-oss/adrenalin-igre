import {
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from "discord.js";

import fs from "fs";

// === NOVO — handler u istom formatu kao ostali ===
export async function handleTrename(client, interaction) {
  if (!interaction.isButton()) return;
  if (interaction.customId !== "ticket_rename") return;

  const channel = interaction.channel;

  // =========================================
  // Učitavanje baze
  // =========================================

  const path = "./tickets.json";
  if (!fs.existsSync(path)) return;

  const tickets = JSON.parse(fs.readFileSync(path, "utf8"));
  const ticketData = tickets[channel.id];

  if (!ticketData) {
    return interaction.reply({
      content: `${emoji("error")} Ovaj kanal nije registrovan kao ticket.`,
      ephemeral: true,
    });
  }

  // =========================================
  // Modal — unos novog imena
  // =========================================

  const modal = new ModalBuilder()
    .setCustomId("ticket_rename_modal")
    .setTitle("Promeni ime ticketa");

  const input = new TextInputBuilder()
    .setCustomId("ticket_new_name")
    .setLabel("Unesi novo ime kanala")
    .setPlaceholder("npr: problem-sa-serverom")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(input));

  await interaction.showModal(modal);

  // =========================================
  // Čekanje modal rezultata
  // =========================================

  const modalSubmit = await interaction
    .awaitModalSubmit({
      filter: (i) =>
        i.customId === "ticket_rename_modal" &&
        i.user.id === interaction.user.id,
      time: 30000,
    })
    .catch(() => null);

  if (!modalSubmit) return;

  const newName = modalSubmit.fields
    .getTextInputValue("ticket_new_name")
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .slice(0, 30)
    .trim();

  if (!newName.length) {
    return modalSubmit.reply({
      content: `${emoji("warning")} Neispravno ime.`,
      ephemeral: true,
    });
  }

  // =========================================
  // Ažuriranje baze
  // =========================================

  const oldName = channel.name;

  ticketData.customName = newName;
  fs.writeFileSync(path, JSON.stringify(tickets, null, 2));

  let prefix = "";

  if (ticketData.priority === "high") prefix = "🔴-";
  else if (ticketData.priority === "medium") prefix = "🟠-";
  else if (ticketData.priority === "low") prefix = "🟢-";

  await channel.setName(`${prefix}${newName}`);

  // =========================================
  // Log u arhivu
  // =========================================

  const archiveID = process.env.TICKET_ARCHIVE_CHANNEL_ID;
  const archive =
    archiveID && interaction.guild.channels.cache.get(archiveID);

  if (archive) {
    archive.send({
      embeds: [
        new EmbedBuilder()
          .setColor("#3498db")
          .setTitle(`${emoji("repeat")} Ticket preimenovan`)
          .addFields(
            { name: "Staro ime", value: oldName, inline: true },
            { name: "Novo ime", value: channel.name, inline: true },
            { name: "Izmenio", value: `<@${interaction.user.id}>`, inline: true }
          )
          .setTimestamp(),
      ],
    });
  }

  return modalSubmit.reply({
    embeds: [
      new EmbedBuilder()
        .setColor("#2ecc71")
        .setDescription(
          `${emoji("success")} Ticket uspešno preimenovan u **${channel.name}**`
        ),
    ],
    ephemeral: true,
  });
}
