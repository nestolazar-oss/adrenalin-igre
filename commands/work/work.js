import { EmbedBuilder } from 'discord.js';
import { initUser, updateUser } from '../../database/userDB.js';
import { emoji } from '../../utils/emojis.js';

const COOLDOWNS = {
  WORK: 4 * 60 * 60 * 1000
};

const JOBS = [
  'Programer',
  'Dizajner',
  'Manager',
  'Inženjer',
  'Učitelj',
  'Doktor',
  'Hemičar',
  'Arhitekta',
  'Analitičar',
  'Konsultant'
];

export const meta = {
  name: 'work',
  description: 'Radi i zarađuj novac (4h cooldown)'
};

export async function execute(message, args) {
  const user = initUser(message.author.id);
  const now = Date.now();

  if (user.lastWork && now - user.lastWork < COOLDOWNS.WORK) {
    const remaining = Math.ceil((COOLDOWNS.WORK - (now - user.lastWork)) / 1000 / 60);

    const embed = new EmbedBuilder()
      .setColor(0xF39C12)
      .setTitle(`${emoji('clock')} Cooldown`)
      .setDescription(`Možeš ponovo raditi za **${remaining}** minuta!`)
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  const job = JOBS[Math.floor(Math.random() * JOBS.length)];
  const earnings = Math.floor(Math.random() * (500 - 100 + 1)) + 100;

  user.cash += earnings;
  user.lastWork = now;
  updateUser(message.author.id, user);

  const embed = new EmbedBuilder()
    .setColor(0x2ECC71)
    .setTitle(`${emoji('survey')} Rad Kompletan!`)
    .setDescription(`Radio si kao **${job}** i zaradio si **$${earnings}**`)
    .addFields(
      { name: `${emoji('coins')} Nova gotovina`, value: `$${user.cash.toLocaleString()}`, inline: false }
    )
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}