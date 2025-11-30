export const handleTtranscript = {
  name: "interactionCreate",

  async execute(client, interaction) {
    if (!interaction.isButton()) return;
    if (interaction.customId !== "ticket_transcript") return;

    const channel = interaction.channel;

    const path = "./tickets.json";
    if (!fs.existsSync(path)) return;

    const tickets = JSON.parse(fs.readFileSync(path, "utf8"));
    const data = tickets[channel.id];

    if (!data) {
      return interaction.reply({
        content: `${emoji("error")} Ovaj kanal nije registrovan kao ticket.`,
        ephemeral: true,
      });
    }

    await interaction.reply({
      content: `${emoji("loading")} Generišem transcript...`,
      ephemeral: true,
    });

    let fetched = [];
    let last;

    while (true) {
      const messages = await channel.messages.fetch({
        limit: 100,
        before: last,
      });

      if (messages.size === 0) break;

      fetched = fetched.concat(Array.from(messages.values()));
      last = messages.last().id;

      if (fetched.length >= 500) break;
    }

    fetched.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    let text = `=== TRANSCRIPT — ${channel.name} ===\n`;
    text += `Korisnik: ${data.user}\n`;
    text += `Otvorio: <@${data.user}>\n`;
    text += `Datum: ${new Date().toLocaleString()}\n`;
    text += `===========================================\n\n`;

    for (const msg of fetched) {
      const time = new Date(msg.createdTimestamp).toLocaleString();
      const author = msg.author?.tag || "Unknown";
      const content = msg.content || "[Embed/Attachment]";

      text += `[${time}] ${author}: ${content}\n`;
    }

    const buffer = Buffer.from(text, "utf8");
    const file = new AttachmentBuilder(buffer, {
      name: `transcript-${channel.id}.txt`,
    });

    const embed = new EmbedBuilder()
      .setColor("#2f3136")
      .setTitle(`${emoji("chat")} Transcript Generisan`)
      .setDescription(
        `${emoji("success")} Transcript za **${channel.name}** je spreman.\n\n` +
        `${emoji("info")} Poslao sam ti ga u DM uključujući i kao reply ovde.`
      )
      .setTimestamp();

    await channel.send({ embeds: [embed], files: [file] });

    try {
      await interaction.user.send({
        content: `${emoji("success")} Tvoj transcript:`,
        files: [file],
      });
    } catch (e) {}

    return interaction.editReply({
      content: `${emoji("success")} Transcript generisan i poslat.`,
    });
  }
};
