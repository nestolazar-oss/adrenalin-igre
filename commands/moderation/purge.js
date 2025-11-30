import { EmbedBuilder } from 'discord.js';
import embeds from '../../utils/embeds.js';

export const meta = {
  name: 'purge',
  aliases: ['clear'],
  description: 'Obriši određeni broj poruka'
};

export async function execute(message, args) {
  if (!message.member.permissions.has('ManageMessages')) {
    return message.channel.send(embeds.error('Greška', `${emoji('reject')} Nemaš dozvolu!`));
  }

  const amount = parseInt(args[0]);

  if (isNaN(amount) || amount < 1 || amount > 100) {
    return message.channel.send(embeds.error('Greška', `${emoji('error')} Broj poruka mora biti 1-100!`));
  }

  try {
    // prvo obriši poruku komande da ne napravi problem
    await message.delete().catch(() => {});

    const deleted = await message.channel.bulkDelete(amount, true);

    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`${emoji('tada')} Purge Izvršen`)
      .addFields({ name: `${emoji('stats')} Obrisano poruka`, value: `${deleted.size}`, inline: true })
      .setTimestamp();

    // koristimo send (NE reply!)
    const info = await message.channel.send({ embeds: [embed] });

    setTimeout(() => info.delete().catch(() => {}), 5000);

  } catch (error) {
    console.error('Purge error:', error);
    return message.channel.send(embeds.error('Greška', `${emoji('error')} Nisam mogao obrisati poruke!`));
  }
}
