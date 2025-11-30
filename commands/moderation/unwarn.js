import { EmbedBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import embeds from '../../utils/embeds.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WARNS_FILE = path.join(__dirname, '../../data/warns.json');

async function getWarns() {
  try {
    const data = await fs.readFile(WARNS_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveWarns(warns) {
  await fs.writeFile(WARNS_FILE, JSON.stringify(warns, null, 2));
}

export const meta = {
  name: 'unwarn',
  description: 'Ukloni upozorenje po ID-ju'
};

export async function execute(message, args) {
  if (!message.member.permissions.has('ModerateMembers')) {
    return message.reply(embeds.error('Greška', `${emoji('reject')} Nemaš dozvolu za unwarn!`));
  }

  const warnId = args[0];

  if (!warnId) {
    return message.reply(embeds.error('Greška', `${emoji('error')} Koristi: \`-unwarn <warn_id>\``));
  }

  const warns = await getWarns();
  const guildId = message.guildId;
  let found = false;

  if (warns[guildId]) {
    for (const [userId, userWarns] of Object.entries(warns[guildId])) {
      const index = userWarns.findIndex(w => w.id === warnId);
      if (index !== -1) {
        userWarns.splice(index, 1);
        found = true;

        if (userWarns.length === 0) {
          delete warns[guildId][userId];
        }

        break;
      }
    }
  }

  if (!found) {
    return message.reply(embeds.error('Greška', `${emoji('error')} Upozorenje nije pronađeno!`));
  }

  await saveWarns(warns);

  const embed = new EmbedBuilder()
    .setColor(0x2ECC71)
    .setTitle(`${emoji('success')} Unwarn Izvršen`)
    .addFields({ name: `${emoji('warning')} Warn ID`, value: warnId, inline: false })
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}