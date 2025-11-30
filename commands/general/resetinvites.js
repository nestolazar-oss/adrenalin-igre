import { EmbedBuilder } from 'discord.js';
import { initUser, updateUser } from '../../utils/db.js';
import embeds from '../../utils/embeds.js';

export const meta_resetstats = {
  name: 'resetstats',
  description: 'Resetuj korisničke statistike'
};

export async function execute_resetstats(message, args) {
  if (!message.member.permissions.has('ManageGuild')) {
    return message.reply(embeds.error('Greška', `${emoji('reject')} Nemaš dozvolu!`));
  }

  const target = message.mentions.users.first();
  const type = args[1]?.toLowerCase();

  if (!target || !type || !['voice', 'messages', 'invites'].includes(type)) {
    return message.reply(embeds.error('Greška', `${emoji('error')} Koristi: \`-resetstats @user <voice|messages|invites>\``));
  }

  const user = initUser(target.id);

  if (type === 'voice') {
    user.voiceTime = 0;
    user.voiceSessions = 0;
  } else if (type === 'messages') {
    user.messages = 0;
  } else if (type === 'invites') {
    user.invites = 0;
  }

  updateUser(target.id, user);

  const embed = new EmbedBuilder()
    .setColor(0x2ECC71)
    .setTitle(`${emoji('success')} Statistika Resetovana`)
    .addFields(
      { name: 'Korisnik', value: target.tag, inline: true },
      { name: 'Tip', value: type.toUpperCase(), inline: true }
    )
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}