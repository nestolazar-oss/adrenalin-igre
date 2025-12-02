import { removeBan } from '../../handlers/bansHandler.js';
import Embeds from '../../utils/embeds.js';
import { emoji } from '../../utils/emojis.js';

export const meta = {
  name: 'unban',
  aliases: ['removeban', 'ub'],
  description: 'Ukloni ban sa korisnika'
};

export async function execute(message, args) {
  if (!message.member.permissions.has('BanMembers')) {
    const embeds = new Embeds(message.client);
    return message.reply({
      embeds: [embeds.error('Greška', `${emoji('reject')} Nemaš permisiju za unban!`)]
    });
  }

  const userInput = args[0];
  const reason = args.slice(1).join(' ') || 'Bez razloga';

  if (!userInput) {
    return message.reply(`${emoji('error')} Koristi: \`-unban <ID> [razlog]\``);
  }

  const embeds = new Embeds(message.client);

  try {
    // Unban samo sa ID-om
    if (!/^\d+$/.test(userInput)) {
      return message.reply({
        embeds: [embeds.error('Greška', `${emoji('error')} Koristi ID korisnika, ne mention!`)]
      });
    }

    await message.guild.bans.remove(userInput, reason);

    // Ažurira bazu - označi ban kao neaktivan
    await removeBan(message.guildId, userInput);

    const embed = embeds.custom({
      title: `${emoji('success')} Ban Uklonjen`,
      description: `Korisnik ID: \`${userInput}\` je debannovan.`,
      color: 0x2ECC71,
      fields: [
        { name: `${emoji('info')} Razlog`, value: reason, inline: false }
      ]
    });

    return message.reply({ embeds: [embed] });
  } catch (e) {
    return message.reply({
      embeds: [embeds.error('Greška', `Greška pri unbanu: ${e.message}`)]
    });
  }
}

export default { meta, execute };