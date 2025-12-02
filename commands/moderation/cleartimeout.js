import { findUser } from '../../handlers/moderationHandler.js';
import Embeds from '../../utils/embeds.js';
import { emoji } from '../../utils/emojis.js';

export const meta = {
  name: 'cleartimeout',
  aliases: ['unmute', 'untimeout', 'ct', 'um'],
  description: 'Ukloni timeout sa korisnika'
};

export async function execute(message, args) {
  if (!message.member.permissions.has('ModerateMembers')) {
    const embeds = new Embeds(message.client);
    return message.reply({
      embeds: [embeds.error('Greška', `${emoji('reject')} Nemaš permisiju!`)]
    });
  }

  const userInput = args[0];
  const reason = args.slice(1).join(' ') || 'Bez razloga';

  if (!userInput) {
    return message.reply(`${emoji('error')} Koristi: \`-cleartimeout <@user ili ID> [razlog]\``);
  }

  const embeds = new Embeds(message.client);
  const user = await findUser(message.guild, userInput);

  if (!user) {
    return message.reply({
      embeds: [embeds.error('Greška', `${emoji('error')} Korisnik nije pronađen!`)]
    });
  }

  const member = await message.guild.members.fetch(user.id).catch(() => null);

  if (!member) {
    return message.reply({
      embeds: [embeds.error('Greška', `${emoji('error')} Korisnik nije na serveru!`)]
    });
  }

  try {
    await member.timeout(null, reason);

    const embed = embeds.custom({
      title: `${emoji('success')} Timeout Uklonjen`,
      description: `${user.tag} je oslobođen timeout-a.`,
      color: 0x2ECC71,
      fields: [
        { name: `${emoji('info')} Razlog`, value: reason, inline: false }
      ]
    });

    return message.reply({ embeds: [embed] });
  } catch (e) {
    return message.reply({
      embeds: [embeds.error('Greška', `Greška pri cleartimeout: ${e.message}`)]
    });
  }
}

export default { meta, execute };