import { 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder 
} from 'discord.js';
import { emoji } from '../../utils/emojis.js';

export const meta = {
  name: 'help',
  aliases: ['h', 'commands'],
  description: 'Prikaži sve komande'
};

export async function execute(message) {
  const PREFIX = process.env.PREFIX || '-';

  const categories = [
    { id: 'economy', name: 'Economy', emoji: emoji('coins') },
    { id: 'work', name: 'Work', emoji: emoji('survey') },
    { id: 'games', name: 'Igre', emoji: emoji('gamepad') },
    { id: 'fun', name: 'Fun', emoji: emoji('sparkles') },
    { id: 'general', name: 'General', emoji: emoji('menu') },
    { id: 'giveaway', name: 'Giveaway', emoji: emoji('gift') },
    { id: 'moderation', name: 'Moderation', emoji: emoji('hammer') },
    { id: 'tickets', name: 'Tickets', emoji: emoji('ticket') },
    { id: 'admin', name: 'Admin', emoji: emoji('wrench') }
  ];

  // MAIN EMBED
  const embed = new EmbedBuilder()
    .setColor(0x2596BE)
    .setTitle(`${emoji('menu')} Adrenalin - Help Meni`)
    .setDescription(
      `Koristi **select menu ispod** da izabereš kategoriju.\n\n` +
      categories.map(c => `${c.emoji} **${c.name}**`).join('\n')
    )
    .setThumbnail(message.client.user.displayAvatarURL({ size: 256 }))
    .setFooter({ text: `Prefix: ${PREFIX} | Adrenalin` })
    .setTimestamp();

  // Select Menu
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`help:menu:${message.author.id}`)
    .setPlaceholder('🔍 Odaberi kategoriju...')
    .addOptions(
      categories.map(c => ({
        label: c.name,
        value: c.id,
        emoji: c.emoji
      }))
    );

  const row = new ActionRowBuilder().addComponents(menu);

  const reply = await message.reply({ embeds: [embed], components: [row] });

  // Collector
  const collector = reply.createMessageComponentCollector({
    filter: i => i.user.id === message.author.id,
    time: 300000
  });

  collector.on('collect', async (interaction) => {
    const value = interaction.values[0];
    let newEmbed = new EmbedBuilder()
      .setTimestamp()
      .setFooter({ text: `Prefix: ${PREFIX} | Adrenalin` });

    // --- ECONOMY ---
    if (value === 'economy') {
      newEmbed
        .setColor(0x2ECC71)
        .setTitle(`${emoji('coins')} Economy Komande`)
        .addFields(
          { name: '`-bal`', value: 'Prikaži balans', inline: false },
          { name: '`-dep <amount>`', value: 'Depozituj novac', inline: false },
          { name: '`-with <amount>`', value: 'Podigni novac iz banke', inline: false },
          { name: '`-send @user <amount>`', value: 'Pošalji novac drugome', inline: false },
          { name: '`-lb`', value: 'Economy leaderboard', inline: false }
        );
    }

    // --- WORK ---
    else if (value === 'work') {
      newEmbed
        .setColor(0xF39C12)
        .setTitle(`${emoji('survey')} Work Komande`)
        .addFields(
          { name: '`-work`', value: 'Radi i zarađuj', inline: false },
          { name: '`-crime`', value: 'Uradi zločin', inline: false },
          { name: '`-slut`', value: 'Rizikuj i zaradi', inline: false },
          { name: '`-rob @user`', value: 'Opljačkaj korisnika', inline: false }
        );
    }

    // --- IGRE ---
    else if (value === 'games') {
      newEmbed
        .setColor(0x9B59B6)
        .setTitle(`${emoji('gamepad')} Igre Komande`)
        .addFields(
          { name: '`-flags`', value: 'Pogađaj zastave', inline: false },
          { name: '`-coinflip <bet> <side>`', value: 'Novčić 50/50', inline: false },
          { name: '`-mines <bet> <broj mina>`', value: 'Mines igra', inline: false },
          { name: '`-roulette <opcija> <bet>`', value: 'Rulet', inline: false },
          { name: '`-towers <bet>`', value: 'Penjanje po kuli', inline: false },
          { name: '`-bj <bet>`', value: 'Blackjack', inline: false },
          { name: '`-guess`', value: 'Pogodi broj', inline: false },
          { name: '`-trivia`', value: 'Trivia kviz', inline: false },
          { name: '`-riddle`', value: 'Zagonetke', inline: false },
          { name: '`-memory <bet>`', value: 'Memory igra', inline: false },
          { name: '`-word`', value: 'Pogodi reč', inline: false }
        );
    }

    // --- FUN ---
    else if (value === 'fun') {
      newEmbed
        .setColor(0xE84393)
        .setTitle(`${emoji('sparkles')} Fun Komande`)
        .addFields(
          { name: '`-actions`', value: 'Zabavne interakcije (hug, kiss, slap...)', inline: false }
        );
    }

    // --- GENERAL ---
    else if (value === 'general') {
      newEmbed
        .setColor(0x3498DB)
        .setTitle(`${emoji('menu')} General Komande`)
        .addFields(
          { name: '`-avatar`', value: 'Prikaži avatar', inline: false },
          { name: '`-banner`', value: 'Prikaži banner', inline: false },
          { name: '`-avatarbanner`', value: 'Avatar + banner', inline: false },
          { name: '`-botinfo`', value: 'Informacije o botu', inline: false },
          { name: '`-serverinfo`', value: 'Informacije o serveru', inline: false },
          { name: '`-profile`', value: 'Profil korisnika', inline: false },
          { name: '`-stats`', value: 'Statistike', inline: false },
          { name: '`-reminders`', value: 'Podsetnici', inline: false },
          { name: '`-invites`', value: 'Tvoji invite-i', inline: false },
          { name: '`-inviter`', value: 'Ko te je pozvao?', inline: false },
          { name: '`-messages`', value: 'Message statistike', inline: false },
          { name: '`-suggestions`', value: 'Pošalji predlog', inline: false }
        );
    }

    // --- GIVEAWAY ---
    else if (value === 'giveaway') {
      newEmbed
        .setColor(0x00CC99)
        .setTitle(`${emoji('gift')} Giveaway Komande`)
        .addFields(
          { name: '`-gstart`', value: 'Pokreni giveaway', inline: false },
          { name: '`-glist`', value: 'Lista aktivnih giveaway-a', inline: false },
          { name: '`-greroll`', value: 'Reroll giveaway-a', inline: false }
        );
    }

    // --- MODERATION ---
    else if (value === 'moderation') {
      newEmbed
        .setColor(0xE74C3C)
        .setTitle(`${emoji('hammer')} Moderation Komande`)
        .addFields(
          { name: '`-ban @user`', value: 'Banuj korisnika', inline: false },
          { name: '`-unban <ID>`', value: 'Unban ID-a', inline: false },
          { name: '`-kick @user`', value: 'Kick korisnika', inline: false },
          { name: '`-timeout @user`', value: 'Timeout korisnika', inline: false },
          { name: '`-cleartimeout @user`', value: 'Ukloni timeout', inline: false },
          { name: '`-warn @user`', value: 'Upozori korisnika', inline: false },
          { name: '`-unwarn @user <broj>`', value: 'Ukloni warn', inline: false },
          { name: '`-warnlist @user`', value: 'Lista warnova', inline: false },
          { name: '`-purge <broj>`', value: 'Obriši poruke', inline: false },
          { name: '`-poll`', value: 'Kreiraj anketu', inline: false },
          { name: '`-nuke`', value: 'Nukuj kanal', inline: false }
        );
    }

    // --- TICKETS ---
    else if (value === 'tickets') {
      newEmbed
        .setColor(0xFDA7DF)
        .setTitle(`${emoji('ticket')} Ticket Komande`)
        .addFields(
          { name: '`-tpanel`', value: 'Kreiraj ticket panel', inline: false },
          { name: '`-tadd @user`', value: 'Dodaj osobu u ticket', inline: false },
          { name: '`-tremove @user`', value: 'Ukloni osobu iz ticketa', inline: false },
          { name: '`-talert`', value: 'Alert u ticketu', inline: false },
          { name: '`-tclose`', value: 'Zatvori ticket', inline: false },
          { name: '`-trename <ime>`', value: 'Promeni ime ticketa', inline: false },
          { name: '`-tstats`', value: 'Stats ticketa', inline: false },
          { name: '`-tpriority`', value: 'Podesi prioritet', inline: false },
          { name: '`-tblacklist`', value: 'Blacklist usera iz ticketa', inline: false }
        );
    }

    // --- ADMIN ---
    else if (value === 'admin') {
      newEmbed
        .setColor(0x34495E)
        .setTitle(`${emoji('wrench')} Admin Komande`)
        .addFields(
          { name: '`-addmoney @user <količina>`', value: 'Dodaj novac', inline: false },
          { name: '`-removemoney @user <količina>`', value: 'Ukloni novac', inline: false }
        );
    }

    await interaction.update({ embeds: [newEmbed], components: [row] });
  });
}
