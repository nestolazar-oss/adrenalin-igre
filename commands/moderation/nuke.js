import { EmbedBuilder } from 'discord.js';
import { emoji } from '../../utils/emojis.js';

export const meta = {
  name: 'nuke',
  description: 'Resetuj kanal - obriši sve i kreiraj nanovo'
};

export async function execute(message, args) {
  if (!message.member.permissions.has('ManageChannels')) {
    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`${emoji('reject')} Pristup odbijen`)
      .setDescription('Nemaš dozvolu!')
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  const confirmEmbed = new EmbedBuilder()
    .setColor(0xE74C3C)
    .setTitle(`${emoji('warning')} UPOZORENJE - NUKE`)
    .setDescription(`Sigurno želiš resetovati **${message.channel.name}**?\n\n${emoji('error')} SVE PORUKE će biti obrisane!\n${emoji('clock')} Ovo se ne može vratiti!`)
    .setTimestamp();

  const reply = await message.reply({ embeds: [confirmEmbed] });
  await reply.react('✅');
  await reply.react('❌');

  const filter = (reaction, user) => 
    ['✅', '❌'].includes(reaction.emoji.name) && user.id === message.author.id;

  try {
    const collected = await reply.awaitReactions({ filter, max: 1, time: 30000 });
    const reaction = collected.first();

    if (reaction.emoji.name === '❌') {
      const cancelEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle(`${emoji('error')} Otkazano`)
        .setDescription(`${emoji('success')} Nuke je otkazan`)
        .setTimestamp();
      return reply.edit({ embeds: [cancelEmbed], components: [] });
    }

    const channel = message.channel;
    const channelData = {
      name: channel.name,
      topic: channel.topic,
      nsfw: channel.nsfw,
      position: channel.position,
      permissionOverwrites: channel.permissionOverwrites.cache
    };

    const nuked = await channel.clone({ reason: `Nuke izvršen od strane ${message.author.tag}` });
    
    await nuked.setPosition(channelData.position).catch(() => {});

    await channel.delete(`Nuke izvršen od strane ${message.author.tag}`);

    const successEmbed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle(`${emoji('tada')} Kanal Resetovan!`)
      .setDescription(`${emoji('success')} Kanal **${channelData.name}** je uspešno nukovan!\n\n${emoji('stats')} Moderator: ${message.author.tag}`)
      .setTimestamp();

    await nuked.send({ embeds: [successEmbed] });
  } catch (error) {
    console.error('Nuke error:', error);
    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`${emoji('error')} Greška`)
      .setDescription('Nisam mogao nukovat kanal!')
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }
}