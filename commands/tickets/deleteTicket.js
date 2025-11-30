// commands/tickets/deleteTicket.js
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";
import fs from "fs";

export async function handleTicketDelete(client, interaction) {
  try {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith("ticket_delete")) return;

    const channel = interaction.channel;
    if (!channel) return;

    // Učitaj tickets.json
    const path = "./tickets.json";
    if (!fs.existsSync(path)) {
      return interaction.reply({ content: `${emoji("error")} Tickets baza nije pronađena.`, ephemeral: true });
    }

    const tickets = JSON.parse(fs.readFileSync(path, "utf8"));
    const ticketData = tickets[channel.id];

    if (!ticketData) {
      return interaction.reply({
        content: `${emoji("error")} Ovaj kanal nije registrovan kao ticket.`,
        ephemeral: true,
      });
    }

    // PRVI KLIK — pita za potvrdu
    if (interaction.customId === "ticket_delete") {
      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("ticket_delete_confirm")
          .setLabel("Obriši")
          .setEmoji(emoji("error"))
          .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
          .setCustomId("ticket_delete_cancel")
          .setLabel("Otkaži")
          .setEmoji(emoji("warning"))
          .setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("#E74C3C")
            .setTitle(`${emoji("warning")} Potvrdi brisanje`)
            .setDescription(
              `Da li si siguran da želiš **obrisati ticket**?\n\n` +
              `${emoji("error")} *Radnja je trajna i ne može se vratiti!*`
            )
        ],
        components: [confirmRow],
        ephemeral: true,
      });
    }

    // CANCEL
    if (interaction.customId === "ticket_delete_cancel") {
      // ako je cancel poslat kao novi interaction (reply prethodnog), update-uj
      if (interaction.replied || interaction.deferred) {
        return interaction.editReply({
          content: `${emoji("success")} Brisanje otkazano.`,
          components: [],
        }).catch(() => {});
      } else {
        return interaction.reply({ content: `${emoji("success")} Brisanje otkazano.`, ephemeral: true });
      }
    }

    // CONFIRM DELETE
    if (interaction.customId === "ticket_delete_confirm") {
      // Log channel (ako postoji)
      const archiveID = process.env.TICKET_ARCHIVE_CHANNEL_ID;
      const archive = archiveID
        ? interaction.guild.channels.cache.get(archiveID)
        : null;

      if (archive) {
        const logEmbed = new EmbedBuilder()
          .setColor("#c0392b")
          .setTitle(`${emoji("stats")} Ticket obrisan`)
          .addFields(
            { name: "Ticket", value: channel.name, inline: true },
            { name: "Korisnik", value: `<@${ticketData.user}>`, inline: true },
            { name: "Obrisao", value: interaction.user.tag, inline: true }
          )
          .setTimestamp();

        // pošalji log, ali ne blokiraj na grešku
        archive.send({ embeds: [logEmbed] }).catch(() => {});
      }

      // Brišemo iz baze
      delete tickets[channel.id];
      try {
        fs.writeFileSync(path, JSON.stringify(tickets, null, 2));
      } catch (e) {
        console.error("Error writing tickets.json:", e);
      }

      // odgovori korisniku i obriši kanal malo kasnije
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply({
            content: `${emoji("success")} Ticket se briše...`,
            components: [],
          });
        } else {
          await interaction.reply({ content: `${emoji("success")} Ticket se briše...`, ephemeral: true });
        }
      } catch (e) { /* ignore */ }

      setTimeout(() => {
        channel.delete().catch(() => {});
      }, 1500);
    }
  } catch (err) {
    console.error("handleTicketDelete error:", err);
    try {
      if (interaction && interaction.isRepliable && !interaction.replied) {
        await interaction.reply({ content: `${emoji("error")} Desila se greška.`, ephemeral: true });
      }
    } catch {}
  }
}
