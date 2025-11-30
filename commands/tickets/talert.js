// =========================================
// talert.js — Alert poruka u ticket (proširena verzija)
// =========================================

import { EmbedBuilder } from "discord.js";

// ================================
// DODATO — handler za import u index.js
// ================================
export async function handleTalert(message, args) {
  return execute(message, args);
}

// POSTOJEĆE
export const meta = {
  name: "talert",
  description: "Pošalje alert poruku u trenutni ticket (predefinisano + custom)"
};

export async function execute(message, args) {
  if (!message.channel.name.startsWith("ticket-")) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#e74c3c")
          .setDescription(`${emoji("error")} Ova komanda se može koristiti samo u ticket kanalima.`)
      ]
    });
  }

  if (!args[0]) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#e67e22")
          .setDescription(
            `${emoji("warning")} Moraš navesti alert tip ili tekst!\n\n**Dostupni alert tipovi:**\n` +
            `\`${message.content.split(" ")[0]} closing\`\n` +
            `\`${message.content.split(" ")[0]} waiting\`\n` +
            `\`${message.content.split(" ")[0]} support\`\n` +
            `\`${message.content.split(" ")[0]} blacklist\`\n\n` +
            `Ili napiši custom poruku:\n` +
            `\`${message.content.split(" ")[0]} treba nam još informacija\``
          )
      ]
    });
  }

  // =========================================
  // PREDEFINISANE PORUKE
  // =========================================
  const predefined = {
    closing: `${emoji("warning")} **Ovaj ticket će uskoro biti zatvoren!**\nAko trebaš još nešto, napiši u roku od nekoliko minuta.`,
    
    waiting: `${emoji("clock")} **Čekamo tvoj odgovor.**\nMolimo te odgovori kada budeš mogao.`,
    
    support: `${emoji("info")} **Support tim je obavešten i uskoro će odgovoriti.**`,
    
    blacklist: `${emoji("reject")} **Ne možeš koristiti ticket sistem.**\nZa više informacija kontaktiraj administraciju.`
  };

  let alertMessage;

  const key = args[0].toLowerCase();
  
  if (predefined[key]) {
    alertMessage = predefined[key];
  } else {
    alertMessage = args.join(" ");
  }

  const mentions =
    message.mentions.members.first() ||
    message.mentions.roles.first() ||
    null;

  const mentionText = mentions ? `${mentions}\n\n` : "";

  const embed = new EmbedBuilder()
    .setColor("#f1c40f")
    .setTitle(`${emoji("warn")} Ticket Alert`)
    .setDescription(`${mentionText}${alertMessage}`)
    .setFooter({ text: "Adrenalin Ticket System" })
    .setTimestamp();

  await message.channel.send({ embeds: [embed] });

  return message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor("#2ecc71")
        .setDescription(`${emoji("success")} Alert poslat.`)
    ]
  });
}
