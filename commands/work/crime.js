import { EmbedBuilder } from 'discord.js';
import { initUser, updateUser } from '../../utils/db.js';
import { COOLDOWNS, CRIME_RESPONSES } from '../../utils/constants.js';
import embeds from '../../utils/embeds.js';

export const meta = {
  name: 'crime',
  description: 'Počini zločin i rizikuj novac (4h cooldown)'
};

export async function execute(message, args) {
  const user = initUser(message.author.id);
  const now = Date.now();

  if (user.lastCrime && now - user.lastCrime < COOLDOWNS.CRIME) {
    const remaining = Math.ceil((COOLDOWNS.CRIME - (now - user.lastCrime)) / 1000 / 60);

    return message.reply({
      embeds: [
        embeds.warning(
          'Cooldown',
          `Možeš ponovo počiniti zločin za **${remaining}** minuta!`
        )
      ]
    });
  }

  const response = CRIME_RESPONSES[Math.floor(Math.random() * CRIME_RESPONSES.length)];
  const success = Math.random() > 0.5;
  const amount = Math.floor(Math.random() * (800 - 200 + 1)) + 200;

  if (success) {
    user.cash += amount;
    user.lastCrime = now;
    updateUser(message.author.id, user);

    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle(`${emoji('tada')} Zločin Uspešan!`)
      .setDescription(response)
      .addFields(
        { name: `${emoji('coins')} Zarada`, value: `+$${amount}`, inline: true },
        { name: `${emoji('cash')} Nova gotovina`, value: `$${user.cash.toLocaleString()}`, inline: true }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  user.cash = Math.max(0, user.cash - amount);
  user.lastCrime = now;
  updateUser(message.author.id, user);

  const embed = new EmbedBuilder()
    .setColor(0xE74C3C)
    .setTitle(`${emoji('warn')} Zločin Neuspešan!`)
    .setDescription(`Uhvaćen si! Izgubio si **$${amount}**`)
    .addFields(
      { name: `${emoji('cash')} Nova gotovina`, value: `$${user.cash.toLocaleString()}`, inline: false }
    )
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}