export const meta = {
  name: 'removemoney',
  aliases: ['remove'],
  description: 'Oduzmi novac korisniku (SAMO VLASNIK)'
};

export async function execute(message, args) {
  const OWNER_ID = process.env.OWNER_ID || '799107594404495413';
  
  if (message.author.id !== OWNER_ID) {
    return message.reply(`${emoji('reject')} Samo vlasnik bota!`);
  }

  const target = message.mentions.users.first();
  const amount = parseInt(args[1]);

  if (!target || isNaN(amount) || amount <= 0) {
    return message.reply(`${emoji('error')} Koristi: \`-removemoney @user <amount>\``);
  }

  const user = initUser(target.id);
  user.cash = Math.max(0, user.cash - amount);
  updateUser(target.id, user);

  const embed = new EmbedBuilder()
    .setColor(0xE74C3C)
    .setTitle(`${emoji('reject')} Novac Oduzan`)
    .setDescription(`${target.tag} je izgubio **$${amount}**`)
    .addFields(
      { name: `${emoji('cash')} Nova gotovina`, value: `$${user.cash.toLocaleString()}`, inline: false }
    )
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}