import { findUser } from '../../handlers/moderationHandler.js';
import { getKicks } from '../../handlers/kicksHandler.js';
import Embeds from '../../utils/embeds.js';
import { emoji } from '../../utils/emojis.js';

export const meta = {
  name: 'kicklist',
  aliases: ['kicks', 'kickhistory'],
  description: 'Prikaži kick istoriju korisnika'
};

export async function execute(message, args) {
  const userInput = args[0];

  if (!userInput) {
    return message.reply(`${emoji('error')} Koristi: \`-kicklist <@user ili ID>\``);
  }

  const embeds = new Embeds(message.client);
  const user = await findUser(message.guild, userInput);

  if (!user) {
    return message.reply({
      embeds: [embeds.error('Greška', `${emoji('error')} Korisnik nije pronađen!`)]
    });
  }

  const kicks = await getKicks(message.guildId, user.id);

  if (kicks.length === 0) {
    return message.reply({
      embeds: [embeds.info('Info', `${user.tag} nema kick istorije!`)]
    });
  }

  const description = kicks
    .map((k, i) => {
      return `**${i + 1}.**\n> Razlog: ${k.reason}\n> Moderator: ${k.moderator} | ${new Date(k.timestamp).toLocaleDateString()}`;
    })
    .join('\n\n');

  const embed = embeds.custom({
    title: `${emoji('tada')} Kick Istorija - ${user.tag}`,
    description,
    color: 0xF39C12,
    fields: [
      { name: `${emoji('tacka')} Ukupno kickova`, value: kicks.length.toString(), inline: true }
    ]
  });

  return message.reply({ embeds: [embed] });
}

export default { meta, execute };