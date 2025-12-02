import { findUser } from '../../handlers/moderationHandler.js';
import { getBans } from '../../handlers/bansHandler.js';
import Embeds from '../../utils/embeds.js';
import { emoji } from '../../utils/emojis.js';

export const meta = {
  name: 'banlist',
  aliases: ['bans', 'banhistory'],
  description: 'Prikaži ban istoriju korisnika'
};

export async function execute(message, args) {
  const userInput = args[0];

  if (!userInput) {
    return message.reply(`${emoji('error')} Koristi: \`-banlist <@user ili ID>\``);
  }

  const embeds = new Embeds(message.client);
  const user = await findUser(message.guild, userInput);

  if (!user) {
    return message.reply({
      embeds: [embeds.error('Greška', `${emoji('error')} Korisnik nije pronađen!`)]
    });
  }

  const bans = await getBans(message.guildId, user.id);

  if (bans.length === 0) {
    return message.reply({
      embeds: [embeds.info('Info', `${user.tag} nema ban istorije!`)]
    });
  }

  const description = bans
    .map((b, i) => {
      const status = b.active ? '🔴 AKTIVAN' : '🟢 DEAKTIVAN';
      return `**${i + 1}. ${status}**\n> Razlog: ${b.reason}\n> Moderator: ${b.moderator} | ${new Date(b.timestamp).toLocaleDateString()}`;
    })
    .join('\n\n');

  const embed = embeds.custom({
    title: `${emoji('reject')} Ban Istorija - ${user.tag}`,
    description,
    color: 0xE74C3C,
    fields: [
      { name: `${emoji('tacka')} Ukupno banovanja`, value: bans.length.toString(), inline: true },
      { name: `${emoji('info')} Status`, value: bans.some(b => b.active) ? 'Trenutno banovan' : 'Nije banovan', inline: true }
    ]
  });

  return message.reply({ embeds: [embed] });
}

export default { meta, execute };
