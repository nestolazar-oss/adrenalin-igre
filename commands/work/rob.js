import { EmbedBuilder } from 'discord.js';
import { initUser, updateUser } from '../../utils/db.js';
import { COOLDOWNS } from '../../utils/constants.js';
import embeds from '../../utils/embeds.js';

export const meta = {
  name: 'rob',
  description: 'Pljačka drugog korisnika (4h cooldown)'
};

export async function execute(message, args) {
  const target = message.mentions.users.first();

  if (!target) {
    return message.reply({
      embeds: [embeds.error('Greška', 'Označi korisnika za pljačku!')]
    });
  }

  if (target.id === message.author.id) {
    return message.reply({
      embeds: [embeds.error('Greška', 'Ne možeš pljačkati sam sebe!')]
    });
  }

  if (target.bot) {
    return message.reply({
      embeds: [embeds.error('Greška', 'Ne možeš pljačkati botove!')]
    });
  }

  const robber = initUser(message.author.id);
  const victim = initUser(target.id);
  const now = Date.now();

  if (robber.lastRob && now - robber.lastRob < COOLDOWNS.ROB) {
    const remaining = Math.ceil((COOLDOWNS.ROB - (now - robber.lastRob)) / 1000 / 60);

    return message.reply({
      embeds: [embeds.warning('Cooldown', `Možeš ponovo pljačkati za **${remaining}** minuta!`)]
    });
  }

  if (victim.cash === 0) {
    return message.reply({
      embeds: [embeds.warning('Pljačka', `${target.tag} nema gotovine!`)]
    });
  }

  const success = Math.random() > 0.4;
  const maxAmount = Math.floor(victim.cash * 0.5);
  const stealAmount = Math.floor(Math.random() * (maxAmount - 1)) + 1;

  if (success) {
    victim.cash -= stealAmount;
    robber.cash += stealAmount;
    robber.lastRob = now;

    updateUser(message.author.id, robber);
    updateUser(target.id, victim);

    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle(`${emoji('tada')} Pljačka Uspešna!`)
      .setDescription(`Uspešno si opljačkao ${target.tag}!`)
      .addFields(
        { name: `${emoji('coins')} Zarada`, value: `+$${stealAmount}`, inline: true },
        { name: `${emoji('cash')} Tvoja nova gotovina`, value: `$${robber.cash.toLocaleString()}`, inline: true },
        { name: `${emoji('bomb')} Žrtvina nova gotovina`, value: `$${victim.cash.toLocaleString()}`, inline: true }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  robber.lastRob = now;
  updateUser(message.author.id, robber);

  const embed = new EmbedBuilder()
    .setColor(0xE74C3C)
    .setTitle(`${emoji('warn')} Pljačka Neuspešna!`)
    .setDescription(`${target.tag} te je uhvatio! Nisi ništa ukrao.`)
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}