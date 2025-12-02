import { findUser } from '../../handlers/moderationHandler.js';
import { getWarns } from '../../handlers/warnsHandler.js';
import Embeds from '../../utils/embeds.js';
import { emoji } from '../../utils/emojis.js';

export const meta = {
  name: 'warnlist',
  aliases: ['warnings', 'warns'],
  description: 'Prikaži upozorenja korisnika'
};

export async function execute(message, args) {
  const userInput = args[0];

  if (!userInput) {
    return message.reply(`${emoji('error')} Koristi: \`-warnlist <@user ili ID>\``);
  }

  const embeds = new Embeds(message.client);
  const user = await findUser(message.guild, userInput);

  if (!user) {
    return message.reply({
      embeds: [embeds.error('Greška', `${emoji('error')} Korisnik nije pronađen!`)]
    });
  }

  const warns = await getWarns(message.guildId, user.id);

  if (warns.length === 0) {
    return message.reply({
      embeds: [embeds.info('Info', `${user.tag} nema upozorenja!`)]
    });
  }

  const description = warns
    .map((w, i) => `**#${w.id}** - ${w.reason}\n> Moderator: ${w.moderator} | ${new Date(w.timestamp).toLocaleDateString()}`)
    .join('\n\n');

  const embed = embeds.custom({
    title: `${emoji('warn')} Upozorenja - ${user.tag}`,
    description,
    color: 0xF39C12,
    fields: [
      { name: `${emoji('tacka')} Ukupno`, value: warns.length.toString(), inline: true }
    ]
  });

  return message.reply({ embeds: [embed] });
}

export default { meta, execute };