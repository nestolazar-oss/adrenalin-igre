// handlers/moderationHandler.js
import { EmbedBuilder } from 'discord.js';
import { emoji } from '../utils/emojis.js';
import Embeds from '../utils/embeds.js';
import { addWarn } from './warnsHandler.js';
import { addBan } from './bansHandler.js';
import { addKick } from './kicksHandler.js';

/**
 * Provjeri da li moderator ima dovoljan rank da akciju obavi
 */
function canModerate(moderator, target, actionType = 'ban') {
  // Za ban i kick - provjeri role hierarchy
  if (actionType === 'ban' || actionType === 'kick') {
    // Pronađi highest role moderatora
    const modHighestRole = moderator.roles.highest;
    // Pronađi highest role target-a
    const targetHighestRole = target.roles.highest;

    // Ako je target ima veci role od moderatora - ne moze
    if (targetHighestRole.position >= modHighestRole.position) {
      return false;
    }
  }

  return true;
}
async function sendDM(user, title, reason, type, embeds) {
  try {
    const dm = await user.createDM();
    
    let embed;
    if (type === 'ban') {
      embed = embeds.custom({
        title: `${emoji('reject')} ${title}`,
        description: `Banovan/na si sa servera!`,
        color: 0xE74C3C,
        fields: [
          { name: `${emoji('info')} Razlog`, value: reason, inline: false }
        ]
      });
    } else if (type === 'kick') {
      embed = embeds.custom({
        title: `${emoji('tada')} ${title}`,
        description: `Uklonjen/na si sa servera!`,
        color: 0xF39C12,
        fields: [
          { name: `${emoji('info')} Razlog`, value: reason, inline: false }
        ]
      });
    } else if (type === 'warn') {
      embed = embeds.custom({
        title: `${emoji('warn')} ${title}`,
        description: `Primio/la si upozorenje!`,
        color: 0xFFD700,
        fields: [
          { name: `${emoji('info')} Razlog`, value: reason, inline: false }
        ]
      });
    } else if (type === 'timeout') {
      embed = embeds.custom({
        title: `${emoji('clock')} ${title}`,
        description: `Stavljen/na si na timeout!`,
        color: 0xFF4444,
        fields: [
          { name: `${emoji('info')} Razlog`, value: reason, inline: false }
        ]
      });
    }

    if (embed) {
      await dm.send({ embeds: [embed] });
    }
  } catch (e) {
    console.error('DM send error:', e.message);
  }
}
export async function findUser(guild, input) {
  // Ako je mention (<@id>)
  const mention = input.match(/<@!?(\d+)>/);
  if (mention) {
    try {
      return await guild.client.users.fetch(mention[1]);
    } catch {
      return null;
    }
  }

  // Ako je ID
  if (/^\d+$/.test(input)) {
    try {
      return await guild.client.users.fetch(input);
    } catch {
      return null;
    }
  }

  // Ako je username
  return guild.members.cache.find(m => m.user.username === input)?.user || null;
}

/**
 * Ban korisnika po ID ili mention
 */
export async function handleBan(message, args, embeds) {
  if (!message.member.permissions.has('BanMembers')) {
    return message.reply({
      embeds: [embeds.error('Greška', 'Nemaš permisiju za ban!', message.author)]
    });
  }

  const userInput = args[0];
  const reason = args.slice(1).join(' ') || 'Bez razloga';

  if (!userInput) {
    return message.reply({
      embeds: [embeds.error('Greška', 'Koristi: -ban <@user ili ID> [razlog]', message.author)]
    });
  }

  const user = await findUser(message.guild, userInput);

  if (!user) {
    return message.reply({
      embeds: [embeds.error('Greška', 'Korisnik nije pronađen!', message.author)]
    });
  }

  // Provjeri role hierarchy
  const target = await message.guild.members.fetch(user.id).catch(() => null);
  if (target && !canModerate(message.member, target, 'ban')) {
    return message.reply({
      embeds: [embeds.error('Greška', `${emoji('reject')} Korisnik ima veći rank od tebe!`, message.author)]
    });
  }

  try {
    await message.guild.members.ban(user, { reason });

    // Spremi ban u bazu
    await addBan(message.guildId, user.id, reason, message.author.tag, message.author.id);

    // Pošalji DM
    await sendDM(user, 'BANOVAN/NA SI', reason, 'ban', embeds);

    return message.reply({
      embeds: [embeds.ban('Korisnik Banovan', {
        user,
        reason,
        author: message.author
      })]
    });
  } catch (e) {
    return message.reply({
      embeds: [embeds.error('Greška', `Greška pri banu: ${e.message}`, message.author)]
    });
  }
}

/**
 * Kick korisnika po ID ili mention
 */
export async function handleKick(message, args, embeds) {
  if (!message.member.permissions.has('KickMembers')) {
    return message.reply({
      embeds: [embeds.error('Greška', 'Nemaš permisiju za kick!', message.author)]
    });
  }

  const userInput = args[0];
  const reason = args.slice(1).join(' ') || 'Bez razloga';

  if (!userInput) {
    return message.reply({
      embeds: [embeds.error('Greška', 'Koristi: -kick <@user ili ID> [razlog]', message.author)]
    });
  }

  const user = await findUser(message.guild, userInput);

  if (!user) {
    return message.reply({
      embeds: [embeds.error('Greška', 'Korisnik nije pronađen!', message.author)]
    });
  }

  const member = await message.guild.members.fetch(user.id).catch(() => null);

  if (!member) {
    return message.reply({
      embeds: [embeds.error('Greška', 'Korisnik nije na serveru!', message.author)]
    });
  }

  // Provjeri role hierarchy
  if (!canModerate(message.member, member, 'kick')) {
    return message.reply({
      embeds: [embeds.error('Greška', `${emoji('reject')} Korisnik ima veći rank od tebe!`, message.author)]
    });
  }

  try {
    await member.kick(reason);

    // Spremi kick u bazu
    await addKick(message.guildId, user.id, reason, message.author.tag, message.author.id);

    // Pošalji DM
    await sendDM(user, 'UKLONJEN/NA SI', reason, 'kick', embeds);

    return message.reply({
      embeds: [embeds.kick('Korisnik Uklonjen', {
        user,
        reason,
        author: message.author
      })]
    });
  } catch (e) {
    return message.reply({
      embeds: [embeds.error('Greška', `Greška pri kicku: ${e.message}`, message.author)]
    });
  }
}

/**
 * Warn korisnika po ID ili mention
 */
export async function handleWarn(message, args, embeds) {
  if (!message.member.permissions.has('ModerateMembers')) {
    return message.reply({
      embeds: [embeds.error('Greška', 'Nemaš permisiju za upozorenja!', message.author)]
    });
  }

  const userInput = args[0];
  const reason = args.slice(1).join(' ') || 'Bez razloga';

  if (!userInput) {
    return message.reply({
      embeds: [embeds.error('Greška', 'Koristi: -warn <@user ili ID> [razlog]', message.author)]
    });
  }

  const user = await findUser(message.guild, userInput);

  if (!user) {
    return message.reply({
      embeds: [embeds.error('Greška', 'Korisnik nije pronađen!', message.author)]
    });
  }

  const member = await message.guild.members.fetch(user.id).catch(() => null);

  if (!member) {
    return message.reply({
      embeds: [embeds.error('Greška', 'Korisnik nije na serveru!', message.author)]
    });
  }

  try {
    // Spremi warn u bazu
    const warn = await addWarn(message.guildId, user.id, reason, message.author.tag);

    if (!warn) {
      return message.reply({
        embeds: [embeds.error('Greška', 'Greška pri sprema upozorenja', message.author)]
      });
    }

    // Pošalji DM
    await sendDM(user, 'UPOZOREN/NA SI', reason, 'warn', embeds);

    return message.reply({
      embeds: [embeds.warn('Korisnik Upozoren', {
        user,
        reason,
        count: warn.id,
        author: message.author
      })]
    });
  } catch (e) {
    return message.reply({
      embeds: [embeds.error('Greška', `Greška pri upozorenju: ${e.message}`, message.author)]
    });
  }
}

/**
 * Timeout korisnika po ID ili mention
 */
export async function handleTimeout(message, args, embeds) {
  if (!message.member.permissions.has('ModerateMembers')) {
    return message.reply({
      embeds: [embeds.error('Greška', 'Nemaš permisiju za timeout!', message.author)]
    });
  }

  const userInput = args[0];
  const durationStr = args[1] || '5m'; // default 5 minuta
  const reason = args.slice(2).join(' ') || 'Bez razloga';

  if (!userInput) {
    return message.reply({
      embeds: [embeds.error('Greška', 'Koristi: -timeout <@user ili ID> [5m|10m|1h] [razlog]', message.author)]
    });
  }

  const user = await findUser(message.guild, userInput);

  if (!user) {
    return message.reply({
      embeds: [embeds.error('Greška', 'Korisnik nije pronađen!', message.author)]
    });
  }

  const member = await message.guild.members.fetch(user.id).catch(() => null);

  if (!member) {
    return message.reply({
      embeds: [embeds.error('Greška', 'Korisnik nije na serveru!', message.author)]
    });
  }

  // Parsiraj trajanje
  const durationMs = parseDuration(durationStr);

  if (!durationMs) {
    return message.reply({
      embeds: [embeds.error('Greška', 'Koristi: 5m, 10m, 1h, itd.', message.author)]
    });
  }

  try {
    await member.timeout(durationMs, reason);

    // Pošalji DM
    await sendDM(user, 'TIMEOUT', reason, 'timeout', embeds);

    return message.reply({
      embeds: [embeds.timeout('Korisnik Na Timeout-u', {
        user,
        duration: durationStr,
        reason,
        author: message.author
      })]
    });
  } catch (e) {
    return message.reply({
      embeds: [embeds.error('Greška', `Greška pri timeout-u: ${e.message}`, message.author)]
    });
  }
}

/**
 * Parsiraj duration string u millisekunde
 */
function parseDuration(str) {
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) return null;

  const [, num, unit] = match;
  const n = parseInt(num);

  const units = {
    s: 1000,
    m: 1000 * 60,
    h: 1000 * 60 * 60,
    d: 1000 * 60 * 60 * 24
  };

  return n * (units[unit] || 0);
}

export default {
  findUser,
  handleBan,
  handleKick,
  handleWarn,
  handleTimeout,
  parseDuration
};