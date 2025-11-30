import { EmbedBuilder } from 'discord.js';
import embeds from '../../utils/embeds.js';

export const meta = {
  name: 'nuke',
  description: 'Resetuj kanal - obriši sve i kreiraj nanovo'
};

export async function execute(message, args) {
  if (!message.member.permissions.has('ManageChannels')) {
    return message.reply(embeds.error('Greška', `${emoji('reject')} Nemaš dozvolu!`));
  }

  const confirmEmbed = new EmbedBuilder()
    .setColor(0xE74C3C)
    .setTitle(`${emoji('warning')} UPOZORENJE - NUKE`)
    .setDescription(`Sigurno želiš resetovati **${message.channel.name}**?\n\n${emoji('error')} SVE PORUKE će biti obrisane!\n${emoji('clock')} Ovo se ne može vratiti!`);

  const reply = await message.reply({ embeds: [confirmEmbed] });
  await reply.react('✅');
  await reply.react('❌');

  const filter = (reaction, user) => 
    ['✅', '❌'].includes(reaction.emoji.name) && user.id === message.author.id;

  try {
    const collected = await reply.awaitReactions({ filter, max: 1, time: 30000 });
    const reaction = collected.first();

    if (reaction.emoji.name === '❌') {
      return reply.edit({ embeds: [embeds.error('Otkazano', `${emoji('success')} Nuke je otkazan`)] });
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
    
    const orderMove = await message.guild.channels.fetch();
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
    return message.reply(embeds.error('Greška', `${emoji('error')} Nisam mogao nukovat kanal!`));
  }
}