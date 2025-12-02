import { EmbedBuilder } from 'discord.js';
import { initUser, updateUser } from '../../database/userDB.js';
import { emoji } from '../../utils/emojis.js';

const COOLDOWNS = {
  SLUT: 4 * 60 * 60 * 1000
};

const SLUT_RESPONSES = [
  'Pronašao si novčić na ulici!',
  'Pronašao si starinsku vreću sa novcem!',
  'Izvukao si rizikantnu kartu - WIN!',
  'Pronašao si trezor ispod motke!',
  'Lotto je izašao u tvoju korist!',
  'Pronašao si zlatnu grešku!',
  'Pronašao si skrivenu blagajnu!',
  'Izvukao si zlatnu karticu!'
];

export const meta = {
  name: 'slut',
  description: 'Rizikuj i pokupi novac (4h cooldown)'
};

export async function execute(message, args) {
  const user = initUser(message.author.id);
  const now = Date.now();

  if (user.lastSlut && now - user.lastSlut < COOLDOWNS.SLUT) {
    const remaining = Math.ceil((COOLDOWNS.SLUT - (now - user.lastSlut)) / 1000 / 60);

    const embed = new EmbedBuilder()
      .setColor(0xF39C12)
      .setTitle(`${emoji('clock')} Cooldown`)
      .setDescription(`Možeš ponovo za **${remaining}** minuta!`)
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  const response = SLUT_RESPONSES[Math.floor(Math.random() * SLUT_RESPONSES.length)];
  const success = Math.random() > 0.3;
  const amount = Math.floor(Math.random() * (600 - 150 + 1)) + 150;

  if (success) {
    user.cash += amount;
    user.lastSlut = now;
    updateUser(message.author.id, user);

    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle(`${emoji('tada')} Rizik Uspešan!`)
      .setDescription(response)
      .addFields(
        { name: `${emoji('coins')} Zarada`, value: `+$${amount}`, inline: true },
        { name: `${emoji('cash')} Nova gotovina`, value: `$${user.cash.toLocaleString()}`, inline: true }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  const lost = Math.floor(amount / 2);

  user.cash = Math.max(0, user.cash - lost);
  user.lastSlut = now;
  updateUser(message.author.id, user);

  const embed = new EmbedBuilder()
    .setColor(0xE74C3C)
    .setTitle(`${emoji('bomb')} Rizik Neuspešan!`)
    .setDescription(`Nešto je pošlo naopako! Izgubio si **$${lost}**`)
    .addFields(
      { name: `${emoji('cash')} Nova gotovina`, value: `$${user.cash.toLocaleString()}`, inline: false }
    )
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}