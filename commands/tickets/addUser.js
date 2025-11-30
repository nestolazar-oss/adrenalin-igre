// =========================================
// addUser.js — Dodavanje korisnika u tiket
// =========================================

import {
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from "discord.js";

import fs from "fs";

export async function handleTicketAddUser(client, interaction) {
  // Dugme provera
  if (!interaction.isButton()) return;
  if (interaction.customId !== "ticket_adduser") return;

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
    .setCustomId("ticket_adduser_modal")
    .setTitle("Dodaj korisnika");

  const userInput = new TextInputBuilder()
    .setCustomId("ticket_adduser_value")
    .setLabel("Unesi @user ili ID")
    .setRequired(true)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("@korisnik ili 123456789");

  const row = new ActionRowBuilder().addComponents(userInput);
  modal.addComponents(row);

  await interaction.showModal(modal);

  // =========================================
  // Čekamo unos
  // =========================================
  const modalSubmit = await interaction
    .awaitModalSubmit({
      filter: (i) =>
        i.customId === "ticket_adduser_modal" &&
        i.user.id === interaction.user.id,
      time: 30000,
    })
    .catch(() => null);

  if (!modalSubmit) return;

  const raw = modalSubmit.fields.getTextInputValue("ticket_adduser_value");

  // Pretvaranje inputa u ID
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

  // Provera da li već ima pristup
  const permission = channel.permissionOverwrites.cache.get(member.id);
  if (permission) {
    return modalSubmit.reply({
      content: `${emoji("warning")} Taj korisnik već ima pristup ticketu.`,
      ephemeral: true,
    });
  }

  // =========================================
  // Dodeljuju se permise
  // =========================================

  await channel.permissionOverwrites.edit(member.id, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
    AttachFiles: true,
    EmbedLinks: true,
  });

  // =========================================
  // Log channel (ako postoji)
  // =========================================
  const archiveID = process.env.TICKET_ARCHIVE_CHANNEL_ID;
  const archive = archiveID
    ? interaction.guild.channels.cache.get(archiveID)
    : null;

  if (archive) {
    archive
      .send({
        embeds: [
          new EmbedBuilder()
            .setColor("#2ecc71")
            .setTitle(`${emoji("plus")} Dodan korisnik u ticket`)
            .addFields(
              { name: "Ticket", value: channel.name, inline: true },
              { name: "Korisnik", value: `${member}`, inline: true },
              { name: "Dodao", value: `<@${interaction.user.id}>`, inline: true }
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
    content: `${emoji("success")} Korisnik ${member} je dodat u ticket.`,
    ephemeral: true,
  });
}
