import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';

export const meta = {
  name: 'help',
  aliases: ['h', 'commands'],
  description: 'Prikaži sve komande'
};

export async function execute(message, args) {
  const PREFIX = process.env.PREFIX || '-';

  // Main help embed
  const embed = new EmbedBuilder()
    .setColor(0x2596BE)
    .setTitle('<:adrenalinn:1434931025733095515> Adrenalin - Help Menu')
    .setDescription(`<:adrenalin_search:1434629160759988234> Koristite Select Menu ispod kako bi promenili kategoriju poruke.\n\n<:adrenalin_menu:1434628602132959253> **KATEGORIJE:**\n<:adrenalin_coins:1434624841704800428> Economy\n<:adrenalin_survey:1434628664724553880> Work\n<:adrenalin_gamepad:1434624881408086197> Igre\n<:adrenalin_wrench:1434629927738675412> Admin`)
    .setThumbnail(message.client.user.displayAvatarURL({ size: 256 }))
    .setFooter({ text: `Prefix: ${PREFIX} | Adrenalin`, iconURL: message.client.user.displayAvatarURL() })
    .setTimestamp();

  // Select Menu
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`help:menu:${message.author.id}`)
    .setPlaceholder('🔍 Odaberi kategoriju...')
    .addOptions([
      {
        label: 'Economy',
        value: 'economy',
        description: 'Novac, banka, leaderboard',
        emoji: '<:adrenalin_coins:1434624841704800428>'
      },
      {
        label: 'Work',
        value: 'work',
        description: 'Rad, zločin, pljačka',
        emoji: '<:adrenalin_survey:1434628664724553880>'
      },
      {
        label: 'Igre',
        value: 'games',
        description: 'Blackjack, mines, roulette, flags',
        emoji: '<:adrenalin_gamepad:1434624881408086197>'
      },
      {
        label: 'Admin',
        value: 'admin',
        description: 'Admin komande',
        emoji: '<:adrenalin_wrench:1434629927738675412>'
      }
    ]);

  const row = new ActionRowBuilder().addComponents(menu);

  const reply = await message.reply({ embeds: [embed], components: [row] });

  // Collector za select menu
  const collector = reply.createMessageComponentCollector({ 
    filter: i => i.user.id === message.author.id && i.customId.startsWith('help:menu:'),
    time: 300000 
  });

  collector.on('collect', async (interaction) => {
    const category = interaction.values[0];
    let newEmbed;

    if (category === 'economy') {
      newEmbed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('<:adrenalin_coins:1434624841704800428> Economy Komande')
        .addFields(
          { name: '`-bal [@user]`', value: 'Prikaži novac i rang', inline: false },
          { name: '`-dep <amount>`', value: 'Depozituj novac u banku (all/half)', inline: false },
          { name: '`-with <amount>`', value: 'Povuci novac iz banke', inline: false },
          { name: '`-send @user <amount>`', value: 'Pošalji novac drugom', inline: false },
          { name: '`-lb`', value: 'Prikaži leaderboard', inline: false }
        )
        .setFooter({ text: 'Prefix: - | Adrenalin' })
        .setTimestamp();
    } else if (category === 'work') {
      newEmbed = new EmbedBuilder()
        .setColor(0xF39C12)
        .setTitle('<:adrenalin_survey:1434628664724553880> Work Komande')
        .addFields(
          { name: '`-work`', value: 'Radi i zarađuj (4h cooldown)', inline: false },
          { name: '`-crime`', value: 'Zločin - Win/Lose (4h cooldown)', inline: false },
          { name: '`-slut`', value: 'Rizik - Win/Lose (4h cooldown)', inline: false },
          { name: '`-rob @user`', value: 'Pljačka korisnika (4h cooldown)', inline: false }
        )
        .setFooter({ text: 'Prefix: - | Adrenalin' })
        .setTimestamp();
    } else if (category === 'games') {
      newEmbed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle('<:adrenalin_gamepad:1434624881408086197> Igre Komande')
        .addFields(
          { name: '`-flags`', value: 'Pogađaj zastavu (75-100$)', inline: false },
          { name: '`-coinflip <bet> <pismo|glava>`', value: 'Novčić 50/50', inline: false },
          { name: '`-mines <bet> [3-11]`', value: 'Pronađi blago (12 polja)', inline: false },
          { name: '`-roulette <opt> <bet>`', value: 'Rulet (zajednička igra)', inline: false },
          { name: '`-towers <bet>`', value: 'Penjanje po kuli', inline: false },
          { name: '`-bj <bet>`', value: 'Blackjack sa dugmićima', inline: false },
          { name: '`-guess lb`', value: 'Pogodi broj - Leaderboard', inline: false },
          { name: '`-word lb`', value: 'Pogađaj reč - Leaderboard', inline: false }
        )
        .setFooter({ text: 'Prefix: - | Adrenalin' })
        .setTimestamp();
    } else if (category === 'admin') {
      newEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('<:adrenalin_wrench:1434629927738675412> Admin Komande')
        .addFields(
          { name: '`-addmoney @user <amount>`', value: 'Dodaj novac korisniku (VLASNIK)', inline: false },
          { name: '`-removemoney @user <amount>`', value: 'Ukloni novac korisniku (VLASNIK)', inline: false }
        )
        .setFooter({ text: 'Prefix: - | Adrenalin' })
        .setTimestamp();
    }

    await interaction.update({ embeds: [newEmbed], components: [row] });
  });
}