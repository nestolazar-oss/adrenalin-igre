import { EmbedBuilder } from 'discord.js';
import { initUser, updateUser } from '../../utils/db.js';
import { COOLDOWNS, JOBS } from '../../utils/constants.js';
import embeds from '../../utils/embeds.js';

export const meta = {
  name: 'work',
  description: 'Radi i zarađuj novac (4h cooldown)'
};

export async function execute(message, args) {
  const user = initUser(message.author.id);
  const now = Date.now();

  // ---- COOLDOWN ----
  if (user.lastWork && now - user.lastWork < COOLDOWNS.WORK) {
    const remaining = Math.ceil((COOLDOWNS.WORK - (now - user.lastWork)) / 1000 / 60);

    return message.reply({
      embeds: [
        embeds.warning(
          "Cooldown",
          `Možeš ponovo raditi za **${remaining}** minuta!`
        )
      ]
    });
  }

  // ---- RANDOM POSAO ----
  const job = JOBS[Math.floor(Math.random() * JOBS.length)];
  const earnings = Math.floor(Math.random() * (500 - 100 + 1)) + 100;

  user.cash += earnings;
  user.lastWork = now;
  updateUser(message.author.id, user);

  // ---- SUCCESS EMBED ----
  const embed = new EmbedBuilder()
    .setColor(0x2ECC71)
    .setTitle('💼 Rad Kompletan!')
    .setDescription(`Radio si kao **${job}** i zaradio si **$${earnings}**`)
    .addFields({ name: '💵 Nova gotovina', value: `$${user.cash.toLocaleString()}` })
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}
