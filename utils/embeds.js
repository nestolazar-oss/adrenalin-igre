import { EmbedBuilder } from 'discord.js';
import { CUSTOM_EMOJIS, emoji } from './emojis.js';

export default class Embeds {
  constructor(client) {
    this.client = client;
    this.colors = {
      success: 0x2ECC71,
      error: 0xE74C3C,
      warning: 0xF39C12,
      info: 0x3498DB,
      main: 0x2596BE,
      gold: 0xFFD700,
      purple: 0x9B59B6,
      dark: 0x1a1a2e,
      embed: 0x2596BE
    };
  }

  emoji(key) {
    return emoji(key);
  }

  // ========================================
  // GAMES - WIN/LOSE/DRAW
  // ========================================
  
  gameWin(title, { description, winAmount, totalAmount, author, multiplier, fields = [], image } = {}) {
    const lines = [description || ''];
    lines.push('');
    lines.push(`${emoji('coins')} **Dobit:** $${winAmount?.toLocaleString() || 0}`);
    lines.push(`${emoji('trophy')} **Nova gotovina:** $${totalAmount?.toLocaleString() || 0}`);
    if (multiplier) lines.push(`${emoji('lightning')} **Multiplier:** ${multiplier}x`);

    const eb = new EmbedBuilder()
      .setColor(this.colors.success)
      .setTitle(`${emoji('celebration')} ${title}`)
      .setDescription(lines.join('\n'))
      .addFields(...fields)
      .setTimestamp();

    if (image) eb.setImage(image);
    if (author) eb.setFooter({ text: author.tag || author.username, iconURL: author.displayAvatarURL?.({ dynamic: true }) });

    return eb;
  }

  gameLose(title, { description, lostAmount, remainingAmount, author, reason, fields = [], image } = {}) {
    const lines = [description || ''];
    lines.push('');
    if (reason) lines.push(`> ${reason}`);
    lines.push(`${emoji('bomb')} **Gubitak:** -$${lostAmount?.toLocaleString() || 0}`);
    lines.push(`${emoji('coins')} **Preostalo:** $${remainingAmount?.toLocaleString() || 0}`);

    const eb = new EmbedBuilder()
      .setColor(this.colors.error)
      .setTitle(`${emoji('error')} ${title}`)
      .setDescription(lines.join('\n'))
      .addFields(...fields)
      .setTimestamp();

    if (image) eb.setImage(image);
    if (author) eb.setFooter({ text: author.tag || author.username, iconURL: author.displayAvatarURL?.({ dynamic: true }) });

    return eb;
  }

  gameDraw(title, { description, returnAmount, author, fields = [], image } = {}) {
    const lines = [description || ''];
    lines.push('');
    lines.push(`${emoji('coins')} **Vraćeno:** $${returnAmount?.toLocaleString() || 0}`);

    const eb = new EmbedBuilder()
      .setColor(this.colors.warning)
      .setTitle(`${emoji('warning')} ${title}`)
      .setDescription(lines.join('\n'))
      .addFields(...fields)
      .setTimestamp();

    if (image) eb.setImage(image);
    if (author) eb.setFooter({ text: author.tag || author.username, iconURL: author.displayAvatarURL?.({ dynamic: true }) });

    return eb;
  }

  // ========================================
  // ECONOMY - BALANCE, SEND, DEPOSIT
  // ========================================

  balance(title, { user, cash, bank, total, rank, totalUsers, author } = {}) {
    const eb = new EmbedBuilder()
      .setColor(this.colors.main)
      .setTitle(`${emoji('bank')} ${title}`)
      .setThumbnail(user?.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: `${emoji('cash')} Gotovina`, value: `$${cash?.toLocaleString() || 0}`, inline: true },
        { name: `${emoji('bank')} Banka`, value: `$${bank?.toLocaleString() || 0}`, inline: true },
        { name: `${emoji('wallet')} Ukupno`, value: `$${total?.toLocaleString() || 0}`, inline: true },
        { name: `${emoji('trophy')} Rang`, value: `#${rank || 'N/A'} od ${totalUsers || 0}`, inline: true }
      )
      .setFooter({ text: 'Adrenalin Banka', iconURL: this.client.user?.displayAvatarURL?.({ dynamic: true }) })
      .setTimestamp();

    return eb;
  }

  deposit(title, { amount, newCash, newBank, author } = {}) {
    const eb = new EmbedBuilder()
      .setColor(this.colors.success)
      .setTitle(`${emoji('bank')} ${title}`)
      .setDescription(`${emoji('coins')} Uložili ste **$${amount?.toLocaleString() || 0}** u banku`)
      .addFields(
        { name: `${emoji('cash')} Nova gotovina`, value: `$${newCash?.toLocaleString() || 0}`, inline: true },
        { name: `${emoji('bank')} Nova banka`, value: `$${newBank?.toLocaleString() || 0}`, inline: true }
      )
      .setTimestamp();

    if (author) eb.setFooter({ text: author.tag || author.username, iconURL: author.displayAvatarURL?.({ dynamic: true }) });

    return eb;
  }

  withdraw(title, { amount, newCash, newBank, author } = {}) {
    const eb = new EmbedBuilder()
      .setColor(this.colors.success)
      .setTitle(`${emoji('cash')} ${title}`)
      .setDescription(`${emoji('coins')} Povukli ste **$${amount?.toLocaleString() || 0}** iz banke`)
      .addFields(
        { name: `${emoji('cash')} Nova gotovina`, value: `$${newCash?.toLocaleString() || 0}`, inline: true },
        { name: `${emoji('bank')} Nova banka`, value: `$${newBank?.toLocaleString() || 0}`, inline: true }
      )
      .setTimestamp();

    if (author) eb.setFooter({ text: author.tag || author.username, iconURL: author.displayAvatarURL?.({ dynamic: true }) });

    return eb;
  }

  send(title, { from, to, amount, senderNewCash, receiverNewCash, author } = {}) {
    const eb = new EmbedBuilder()
      .setColor(this.colors.success)
      .setTitle(`${emoji('money_bag')} ${title}`)
      .addFields(
        { name: `${emoji('up')} Pošiljaoc`, value: `${from.tag}\n${emoji('coins')} Nova gotovina: $${senderNewCash?.toLocaleString() || 0}`, inline: true },
        { name: `${emoji('down')} Primač`, value: `${to.tag}\n${emoji('coins')} Nova gotovina: $${receiverNewCash?.toLocaleString() || 0}`, inline: true },
        { name: `${emoji('coins')} Iznos`, value: `$${amount?.toLocaleString() || 0}`, inline: false }
      )
      .setTimestamp();

    if (author) eb.setFooter({ text: author.tag || author.username, iconURL: author.displayAvatarURL?.({ dynamic: true }) });

    return eb;
  }

  // ========================================
  // WORK - WORK, CRIME, ROB, SLUT
  // ========================================

  work(title, { job, earnings, newCash, author } = {}) {
    const eb = new EmbedBuilder()
      .setColor(this.colors.success)
      .setTitle(`${emoji('survey')} ${title}`)
      .setDescription(`${emoji('info')} Radio si kao **${job}** i zaradio si **$${earnings?.toLocaleString() || 0}**`)
      .addFields({ name: `${emoji('coins')} Nova gotovina`, value: `$${newCash?.toLocaleString() || 0}` })
      .setTimestamp();

    if (author) eb.setFooter({ text: author.tag || author.username, iconURL: author.displayAvatarURL?.({ dynamic: true }) });

    return eb;
  }

  crime(title, { description, earnings, newCash, author, success = true } = {}) {
    const eb = new EmbedBuilder()
      .setColor(success ? this.colors.success : this.colors.error)
      .setTitle(`${emoji('fire')} ${title}`)
      .setDescription(`${description || ''}`)
      .addFields(
        { name: `${emoji('coins')} ${success ? 'Zarada' : 'Gubitak'}`, value: `${success ? '+' : '-'}$${earnings?.toLocaleString() || 0}`, inline: true },
        { name: `${emoji('coins')} Nova gotovina`, value: `$${newCash?.toLocaleString() || 0}`, inline: true }
      )
      .setTimestamp();

    if (author) eb.setFooter({ text: author.tag || author.username, iconURL: author.displayAvatarURL?.({ dynamic: true }) });

    return eb;
  }

  rob(title, { target, stealAmount, robberNewCash, targetNewCash, author, success = true } = {}) {
    const eb = new EmbedBuilder()
      .setColor(success ? this.colors.success : this.colors.error)
      .setTitle(`${emoji('bomb')} ${title}`)
      .setDescription(`${success ? `${emoji('success')} Uspešno si opljačkao ${target.tag}!` : `${emoji('warning')} ${target.tag} te je uhvatio!`}`)
      .addFields(
        { name: `${emoji('coins')} ${success ? 'Zarada' : 'Gubitak'}`, value: `${success ? '+' : '-'}$${stealAmount?.toLocaleString() || 0}`, inline: true },
        { name: `${emoji('coins')} Tvoja nova gotovina`, value: `$${robberNewCash?.toLocaleString() || 0}`, inline: true },
        { name: `${emoji('coins')} Njihova nova gotovina`, value: `$${targetNewCash?.toLocaleString() || 0}`, inline: true }
      )
      .setTimestamp();

    if (author) eb.setFooter({ text: author.tag || author.username, iconURL: author.displayAvatarURL?.({ dynamic: true }) });

    return eb;
  }

  slut(title, { description, earnings, newCash, author, success = true } = {}) {
    const eb = new EmbedBuilder()
      .setColor(success ? this.colors.success : this.colors.error)
      .setTitle(`${emoji('fire')} ${title}`)
      .setDescription(description || '')
      .addFields(
        { name: `${emoji('coins')} ${success ? 'Zarada' : 'Gubitak'}`, value: `${success ? '+' : '-'}$${earnings?.toLocaleString() || 0}`, inline: true },
        { name: `${emoji('coins')} Nova gotovina`, value: `$${newCash?.toLocaleString() || 0}`, inline: true }
      )
      .setTimestamp();

    if (author) eb.setFooter({ text: author.tag || author.username, iconURL: author.displayAvatarURL?.({ dynamic: true }) });

    return eb;
  }

  // ========================================
  // ERRORS & WARNINGS
  // ========================================

  error(title, message, author = null) {
    const eb = new EmbedBuilder()
      .setColor(this.colors.error)
      .setTitle(`${emoji('error')} ${title}`)
      .setDescription(`> ${message}`)
      .setTimestamp();

    if (author) eb.setFooter({ text: author.tag || author.username, iconURL: author.displayAvatarURL?.({ dynamic: true }) });

    return eb;
  }

  warning(title, message, author = null) {
    const eb = new EmbedBuilder()
      .setColor(this.colors.warning)
      .setTitle(`${emoji('warning')} ${title}`)
      .setDescription(`> ${message}`)
      .setTimestamp();

    if (author) eb.setFooter({ text: author.tag || author.username, iconURL: author.displayAvatarURL?.({ dynamic: true }) });

    return eb;
  }

  cooldown(command, remainingMinutes, author = null) {
    const eb = new EmbedBuilder()
      .setColor(this.colors.warning)
      .setTitle(`${emoji('clock')} Cooldown`)
      .setDescription(`> ${emoji('timer')} Komanda **${command}** je na cooldown-u!\n> ${emoji('info')} Pokušaj ponovo za **${remainingMinutes}** minuta`)
      .setTimestamp();

    if (author) eb.setFooter({ text: author.tag || author.username, iconURL: author.displayAvatarURL?.({ dynamic: true }) });

    return eb;
  }

  insufficientFunds(currentAmount, requiredAmount, author = null) {
    const difference = requiredAmount - currentAmount;

    const eb = new EmbedBuilder()
      .setColor(this.colors.error)
      .setTitle(`${emoji('error')} Nedovoljno Sredstava`)
      .setDescription(
        `> ${emoji('coins')} Imaš: **$${currentAmount?.toLocaleString() || 0}**\n` +
        `> ${emoji('coins')} Potrebno: **$${requiredAmount?.toLocaleString() || 0}**\n` +
        `> ${emoji('bomb')} Nedostaje ti: **$${difference?.toLocaleString() || 0}**`
      )
      .setTimestamp();

    if (author) eb.setFooter({ text: author.tag || author.username, iconURL: author.displayAvatarURL?.({ dynamic: true }) });

    return eb;
  }

  info(title, message, author = null) {
    const eb = new EmbedBuilder()
      .setColor(this.colors.info)
      .setTitle(`${emoji('info')} ${title}`)
      .setDescription(`> ${message}`)
      .setTimestamp();

    if (author) eb.setFooter({ text: author.tag || author.username, iconURL: author.displayAvatarURL?.({ dynamic: true }) });

    return eb;
  }

  // ========================================
  // LEADERBOARD & STATS
  // ========================================

  leaderboard(title, { description, fields = [], author } = {}) {
    const eb = new EmbedBuilder()
      .setColor(this.colors.gold)
      .setTitle(`${emoji('trophy')} ${title}`)
      .setDescription(description || '')
      .addFields(...fields)
      .setTimestamp();

    if (author) eb.setFooter({ text: author.tag || author.username, iconURL: author.displayAvatarURL?.({ dynamic: true }) });

    return eb;
  }

  stats(title, { user, fields = [], author, thumbnail } = {}) {
    const eb = new EmbedBuilder()
      .setColor(this.colors.main)
      .setTitle(`${emoji('stats')} ${title}`)
      .addFields(...fields)
      .setTimestamp();

    if (thumbnail) eb.setThumbnail(thumbnail);
    if (author) eb.setFooter({ text: author.tag || author.username, iconURL: author.displayAvatarURL?.({ dynamic: true }) });

    return eb;
  }

  // ========================================
  // ADMIN/MODERATION
  // ========================================

  ban(title, { user, reason, author } = {}) {
    const eb = new EmbedBuilder()
      .setColor(this.colors.error)
      .setTitle(`${emoji('reject')} ${title}`)
      .addFields(
        { name: `${emoji('info')} Korisnik`, value: `${user.tag}`, inline: true },
        { name: `${emoji('stats')} Moderator`, value: `${author.tag}`, inline: true },
        { name: `${emoji('warning')} Razlog`, value: reason || 'Bez razloga', inline: false }
      )
      .setTimestamp();

    return eb;
  }

  kick(title, { user, reason, author } = {}) {
    const eb = new EmbedBuilder()
      .setColor(this.colors.warning)
      .setTitle(`${emoji('tada')} ${title}`)
      .addFields(
        { name: `${emoji('info')} Korisnik`, value: `${user.tag}`, inline: true },
        { name: `${emoji('stats')} Moderator`, value: `${author.tag}`, inline: true },
        { name: `${emoji('warning')} Razlog`, value: reason || 'Bez razloga', inline: false }
      )
      .setTimestamp();

    return eb;
  }

  warn(title, { user, reason, count, author } = {}) {
    const eb = new EmbedBuilder()
      .setColor(this.colors.warning)
      .setTitle(`${emoji('warn')} ${title}`)
      .addFields(
        { name: `${emoji('info')} Korisnik`, value: `${user.tag}`, inline: true },
        { name: `${emoji('stats')} Moderator`, value: `${author.tag}`, inline: true },
        { name: `${emoji('warning')} Razlog`, value: reason || 'Bez razloga', inline: false },
        { name: `${emoji('tacka')} Ukupno upozorenja`, value: `${count || 1}`, inline: true }
      )
      .setTimestamp();

    return eb;
  }

  timeout(title, { user, duration, reason, author } = {}) {
    const eb = new EmbedBuilder()
      .setColor(this.colors.warning)
      .setTitle(`${emoji('clock')} ${title}`)
      .addFields(
        { name: `${emoji('info')} Korisnik`, value: `${user.tag}`, inline: true },
        { name: `${emoji('clock')} Trajanje`, value: duration || 'N/A', inline: true },
        { name: `${emoji('stats')} Moderator`, value: `${author.tag}`, inline: true },
        { name: `${emoji('warning')} Razlog`, value: reason || 'Bez razloga', inline: false }
      )
      .setTimestamp();

    return eb;
  }

  // ========================================
  // CUSTOM/GENERIC
  // ========================================

  custom({ title, description, color = this.colors.main, fields = [], author, footer, image, thumbnail } = {}) {
    const eb = new EmbedBuilder()
      .setColor(color)
      .setTimestamp();

    if (title) eb.setTitle(title);
    if (description) eb.setDescription(description);
    if (fields.length) eb.addFields(...fields);
    if (image) eb.setImage(image);
    if (thumbnail) eb.setThumbnail(thumbnail);
    if (author) eb.setFooter({ text: author.tag || author.username, iconURL: author.displayAvatarURL?.({ dynamic: true }) });
    else if (footer) eb.setFooter({ text: footer });

    return eb;
  }
}