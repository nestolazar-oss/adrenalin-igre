import { findUser } from '../../handlers/moderationHandler.js';
import { removeWarn, getWarns } from '../../handlers/warnsHandler.js';
import Embeds from '../../utils/embeds.js';
import { emoji } from '../../utils/emojis.js';

export const meta = {
  name: 'unwarn',
  aliases: ['removewarn', 'rw'],
  description: 'Ukloni upozorenje korisniku'
};

export async function execute(message, args) {
  if (!message.member.permissions.has('ModerateMembers')) {
    const embeds = new Embeds(message.client);
    return message.reply({
      embeds: [embeds.error('Greška', `${emoji('reject')} Nemaš permisiju!`)]
    });
  }

  const userInput = args[0];
  const warnId = parseInt(args[1]);

  if (!userInput || !warnId) {
    return message.reply(`${emoji('error')} Koristi: \`-unwarn <@user ili ID> <warn_id>\``);
  }

  const embeds = new Embeds(message.client);
  const user = await findUser(message.guild, userInput);

  if (!user) {
    return message.reply({
      embeds: [embeds.error('Greška', `${emoji('error')} Korisnik nije pronađen!`)]
    });
  }

  const success = await removeWarn(message.guildId, user.id, warnId);

  if (!success) {
    return message.reply({
      embeds: [embeds.error('Greška', `${emoji('error')} Upozorenje nije pronađeno!`)]
    });
  }

  const warns = await getWarns(message.guildId, user.id);

  const embed = embeds.custom({
    title: `${emoji('success')} Upozorenje Uklonjeno`,
    description: `Upozorenje #${warnId} za ${user.tag} je uklonjeno.`,
    color: 0x2ECC71,
    fields: [
      { name: `${emoji('warn')} Preostala upozorenja`, value: warns.length.toString(), inline: true }
    ]
  });

  return message.reply({ embeds: [embed] });
}

export default { meta, execute };