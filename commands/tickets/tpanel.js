import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionsBitField
} from "discord.js";

export function handleTpanel(client, interaction) {
  const embed = new EmbedBuilder()
    .setColor("#2f3136")
    .setTitle(`${emoji("menu")} Ticket Panel`)
    .setDescription(
      `${emoji("tacka")} **Izaberi tip tiketa koji želiš otvoriti.**\n\n` +
      `${emoji("chat")} **Support Ticket** – Pomoć, pitanja, problemi.\n` +
      `${emoji("warn")} **Report Ticket** – Prijava korisnika/prekršaja.\n` +
      `${emoji("trophy")} **Partnership Ticket** – Partnerstva, saradnje.\n`
    )
    .setFooter({ text: "Adrenalin Ticket System" });

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_support")
      .setLabel("Support")
      .setEmoji(emoji("chat"))
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("ticket_report")
      .setLabel("Report")
      .setEmoji(emoji("warn"))
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId("ticket_partner")
      .setLabel("Partnership")
      .setEmoji(emoji("trophy"))
      .setStyle(ButtonStyle.Success)
  );

  return interaction.reply({
    embeds: [embed],
    components: [buttons]
  });
}
