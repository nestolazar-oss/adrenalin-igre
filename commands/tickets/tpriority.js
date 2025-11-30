import {
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from "discord.js";

import fs from "fs";

export async function handleTpriority(client, interaction) {
  if (!interaction.isButton()) return;
  if (interaction.customId !== "ticket_priority") return;

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
  // Modal — unos prioriteta
  // =========================================

  const modal = new ModalBuilder()
    .setCustomId("ticket_priority_modal")
    .setTitle("Postavi prioritet ticketu");

  const input = new TextInputBuilder()
    .setCustomId("ticket_priority_value")
    .setLabel("Unesi prioritet (high / medium / low)")
    .setPlaceholder("high | medium | low")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(input));

  await interaction.showModal(modal);

  const modalSubmit = await interaction
    .awaitModalSubmit({
      filter: (i) =>
        i.customId === "ticket_priority_modal" &&
        i.user.id === interaction.user.id,
      time: 30000,
    })
    .catch(() => null);

  if (!modalSubmit) return;

  const priorityRaw = modalSubmit.fields
    .getTextInputValue("ticket_priority_value")
    .toLowerCase()
    .trim();

  const valid = ["high", "medium", "low"];

  if (!valid.includes(priorityRaw)) {
    return modalSubmit.reply({
      content: `${emoji("warning")} Dozvoljene vrednosti su **high**, **medium** ili **low**.`,
      ephemeral: true,
    });
  }

  // =========================================
  // Postavljanje prioriteta
  // =========================================

  ticketData.priority = priorityRaw;
  fs.writeFileSync(path, JSON.stringify(tickets, null, 2));

  let tag =
    priorityRaw === "high"
      ? "🔴"
      : priorityRaw === "medium"
      ? "🟠"
      : "🟢";

  await channel.setName(`${tag}-${ticketData.id}`);

  // =========================================
  // Log sistem
  // =========================================

  const archiveID = process.env.TICKET_ARCHIVE_CHANNEL_ID;
  const archive =
    archiveID && interaction.guild.channels.cache.get(archiveID);

  if (archive) {
    archive.send({
      embeds: [
        new EmbedBuilder()
          .setColor("#f1c40f")
          .setTitle(`${emoji("wrench")} Ticket prioritet izmenjen`)
          .addFields(
            { name: "Ticket", value: channel.name, inline: true },
            { name: "Novi prioritet", value: priorityRaw, inline: true },
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
          `${emoji("success")} Prioritet je uspešno postavljen na **${priorityRaw}**`
        ),
    ],
    ephemeral: true,
  });
}
