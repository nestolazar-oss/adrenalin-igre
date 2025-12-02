import { EmbedBuilder } from 'discord.js';
import { emoji } from '../../utils/emojis.js';

export const meta = {
  name: 'purge',
  aliases: ['clear'],
  description: 'Obriši određeni broj poruka'
};

export async function execute(message, args) {
  if (!message.member.permissions.has('ManageMessages')) {
    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`${emoji('reject')} Pristup odbijen`)
      .setDescription('Nemaš dozvolu!')
      .setTimestamp();
    return message.channel.send({ embeds: [embed] });
  }

  const amount = parseInt(args[0]);

  if (isNaN(amount) || amount < 1 || amount > 100) {
    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`${emoji('error')} Greška`)
      .setDescription('Broj poruka mora biti 1-100!')
      .setTimestamp();
    return message.channel.send({ embeds: [embed] });
  }

  try {
    await message.delete().catch(() => {});

    const deleted = await message.channel.bulkDelete(amount, true);

    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`${emoji('tada')} Purge Izvršen`)
      .addFields({ name: `${emoji('stats')} Obrisano poruka`, value: `${deleted.size}`, inline: true })
      .setTimestamp();

    const info = await message.channel.send({ embeds: [embed] });

    setTimeout(() => info.delete().catch(() => {}), 5000);

  } catch (error) {
    console.error('Purge error:', error);
    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`${emoji('error')} Greška`)
      .setDescription('Nisam mogao obrisati poruke!')
      .setTimestamp();
    return message.channel.send({ embeds: [embed] });
  }
}