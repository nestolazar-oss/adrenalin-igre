// =========================================
// tstats.js — Statistika ticket sistema
// =========================================

import { EmbedBuilder } from "discord.js";
import fs from "fs";

// ==========================
// NAMED EXPORT KOJI INDEX.JS TRAŽI
// ==========================
export async function handleTstats(client, message) {
  const path = "./tickets.json";

  if (!fs.existsSync(path)) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#e74c3c")
          .setDescription(`${emoji("error")} Nema pronađenih podataka o ticketima.`),
      ],
    });
  }

  const data = JSON.parse(fs.readFileSync(path, "utf8"));

  // ==============================
  // Izračunavanje statistike
  // ==============================

  let total = 0;
  let active = 0;
  let closed = 0;
  let blacklisted = 0;
  let high = 0;
  let medium = 0;
  let low = 0;

  for (const id in data) {
    const t = data[id];
    total++;

    if (t.status === "open") active++;
    if (t.status === "closed") closed++;
    if (t.blacklisted) blacklisted++;

    if (t.priority === "high") high++;
    if (t.priority === "medium") medium++;
    if (t.priority === "low") low++;
  }

  // ==============================
  // Embed
  // ==============================

  const embed = new EmbedBuilder()
    .setColor("#3498db")
    .setTitle(`${emoji("stats")} Ticket Statistika`)
    .addFields(
      { name: `${emoji("menu")} Ukupno ticketa`, value: `**${total}**`, inline: true },
      { name: `${emoji("chat")} Aktivni`, value: `**${active}**`, inline: true },
      { name: `${emoji("warning")} Zatvoreni`, value: `**${closed}**`, inline: true },
      { name: `${emoji("reject")} Blacklistovani`, value: `**${blacklisted}**`, inline: true },
      { name: `${emoji("fire")} High Priority`, value: `**${high}**`, inline: true },
      { name: `${emoji("tacka")} Medium Priority`, value: `**${medium}**`, inline: true },
      { name: `${emoji("ice")} Low Priority`, value: `**${low}**`, inline: true }
    )
    .setFooter({ text: "Adrenalin Ticket Manager" })
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}

// I dalje ostavljam default ako ti negde treba
export default {
  meta: {
    name: "tstats",
    description: "Prikazuje statistiku ticket sistema",
  },
  execute: handleTstats
};
