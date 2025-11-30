// =========================================
// removeUser.js — Uklanjanje korisnika iz ticketa
// =========================================

import {
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from "discord.js";
import fs from "fs";

export async function handleTicketRemoveUser(client, interaction) {
  if (!interaction.isButton()) return;
  if (interaction.customId !== "ticket_removeuser") return;

  const channel = interaction.channel;

  // Učitavanje baze
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
  // Modal za unos korisnika
  // =========================================

  const modal = new ModalBuilder()
    .setCustomId("ticket_removeuser_modal")
    .setTitle("Ukloni korisnika iz ticketa");

  const input = new TextInputBuilder()
    .setCustomId("ticket_removeuser_value")
    .setLabel("Unesi @user ili ID korisnika")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder("@korisnik ili 123456789");

  modal.addComponents(new ActionRowBuilder().addComponents(input));

  await interaction.showModal(modal);

  // =========================================
  // Čekanje modal unosa
  // =========================================

  const modalSubmit = await interaction
    .awaitModalSubmit({
      filter: (i) =>
        i.customId === "ticket_removeuser_modal" &&
        i.user.id === interaction.user.id,
      time: 30000,
    })
    .catch(() => null);

  if (!modalSubmit) return;

  const raw = modalSubmit.fields.getTextInputValue("ticket_removeuser_value");
  const userId = raw.replace(/<@!?(\d+)>/, "$1");

  const member = await interaction.guild.members
    .fetch(userId)
    .catch(() => null);

  if (!member) {
    return modalSubmit.reply({
      content: `${emoji("error")} Korisnik nije pronađen.`,
      ephemeral: true,
    });
  }

  // Sprečavanje uklanjanja vlasnika ticketa
  if (member.id === ticketData.owner) {
    return modalSubmit.reply({
      content: `${emoji("warning")} Ne možeš ukloniti vlasnika ticketa.`,
      ephemeral: true,
    });
  }

  // Provera da li ima permise
  const permission = channel.permissionOverwrites.cache.get(member.id);
  if (!permission) {
    return modalSubmit.reply({
      content: `${emoji("warning")} Taj korisnik nema pristup ticketu.`,
      ephemeral: true,
    });
  }

  // =========================================
  // Uklanjanje permisa
  // =========================================

  await channel.permissionOverwrites.delete(member.id);

  // =========================================
  // Logovanje
  // =========================================

  const archiveID = process.env.TICKET_ARCHIVE_CHANNEL_ID;
  const archive =
    archiveID && interaction.guild.channels.cache.get(archiveID);

  if (archive) {
    archive
      .send({
        embeds: [
          new EmbedBuilder()
            .setColor("#e74c3c")
            .setTitle(`${emoji("minus")} Uklonjen korisnik iz ticketa`)
            .addFields(
              { name: "Ticket", value: channel.name, inline: true },
              { name: "Korisnik", value: `${member}`, inline: true },
              { name: "Uklonio", value: `<@${interaction.user.id}>`, inline: true }
            )
            .setTimestamp(),
        ],
      })
      .catch(() => {});
  }

  // =========================================
  // Odgovor korisniku
  // =========================================

  await modalSubmit.reply({
    content: `${emoji("success")} Korisnik ${member} je uklonjen iz ticketa.`,
    ephemeral: true,
  });
}
