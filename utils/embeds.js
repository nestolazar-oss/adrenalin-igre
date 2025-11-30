import { EmbedBuilder } from 'discord.js';

// -----------------------------
// MAIN EMBED CLASS
// -----------------------------
class Embeds {

  constructor() {
    this.colors = {
      red: 0xE74C3C,
      green: 0x2ECC71,
      yellow: 0xF1C40F,
      blue: 0x3498DB,
      purple: 0x9B59B6,
      main: 0x2596BE,
      gold: 0xFFD700
    };

    this.emoji = {
      success: '<:adrenalin_accept:1434624788709507196>',
      error: '<:adrenalin_reject:1434629125582225409>',
      warning: '<:adrenalin_warn:1434629908923027479>',
      info: '<:adrenalin_info:1434628553785479392>',
      money: '💰',
      timer: '⏱️',
      flag: '🚩',
      gem: '💎',
      bomb: '💣',
      crown: '👑'
    };
  }

  // SUCCESS EMBED
  success(title, description, author = null) {
    const eb = new EmbedBuilder()
      .setColor(this.colors.green)
      .setTitle(`${this.emoji.success} ${title}`)
      .setDescription(description)
      .setTimestamp();

    if (author) {
      eb.setFooter({
        text: author.tag || author.username,
        iconURL: author.displayAvatarURL?.({ dynamic: true })
      });
    }

    return eb;
  }

  // ERROR EMBED
  error(title, description, author = null) {
    const eb = new EmbedBuilder()
      .setColor(this.colors.red)
      .setTitle(`${this.emoji.error} ${title}`)
      .setDescription(description)
      .setTimestamp();

    if (author) {
      eb.setFooter({
        text: author.tag || author.username,
        iconURL: author.displayAvatarURL?.({ dynamic: true })
      });
    }

    return eb;
  }

  // WARNING EMBED
  warning(title, description, author = null) {
    const eb = new EmbedBuilder()
      .setColor(this.colors.yellow)
      .setTitle(`${this.emoji.warning} ${title}`)
      .setDescription(description)
      .setTimestamp();

    if (author) {
      eb.setFooter({
        text: author.tag || author.username,
        iconURL: author.displayAvatarURL?.({ dynamic: true })
      });
    }

    return eb;
  }

  // INFO EMBED
  info(title, description, author = null) {
    const eb = new EmbedBuilder()
      .setColor(this.colors.blue)
      .setTitle(`${this.emoji.info} ${title}`)
      .setDescription(description)
      .setTimestamp();

    if (author) {
      eb.setFooter({
        text: author.tag || author.username,
        iconURL: author.displayAvatarURL?.({ dynamic: true })
      });
    }

    return eb;
  }

  // GAME STYLE EMBED
  game(title, description, fields = [], author = null) {
    const eb = new EmbedBuilder()
      .setColor(this.colors.main)
      .setTitle(title)
      .setDescription(description)
      .setTimestamp();

    if (fields.length > 0) eb.addFields(fields);

    if (author) {
      eb.setFooter({
        text: author.tag || author.username,
        iconURL: author.displayAvatarURL?.({ dynamic: true })
      });
    }

    return eb;
  }

  // CUSTOM EMBED
  custom({ title, description, color, fields = [], footer, image, thumbnail, author }) {
    const eb = new EmbedBuilder()
      .setColor(color || this.colors.main)
      .setTimestamp();

    if (title) eb.setTitle(title);
    if (description) eb.setDescription(description);
    if (fields.length > 0) eb.addFields(fields);
    if (image) eb.setImage(image);
    if (thumbnail) eb.setThumbnail(thumbnail);

    if (author) {
      eb.setFooter({
        text: author.tag || author.username,
        iconURL: author.displayAvatarURL?.({ dynamic: true })
      });
    } else if (footer) {
      eb.setFooter(footer);
    }

    return eb;
  }
}

// ---------------------------------------
// EXPORTUJEMO JEDNU INSTANCU → FIX !!!
// ---------------------------------------
const embeds = new Embeds();
export default embeds;


// ---------------------------------------
// HELPER FUNKCIJE (ostavljene radi kompatibilnosti)
// ---------------------------------------

export function createSuccessEmbed(title, description, author = null) {
  return embeds.success(title, description, author);
}

export function createErrorEmbed(title, description, author = null) {
  return embeds.error(title, description, author);
}

export function createWarningEmbed(title, description, author = null) {
  return embeds.warning(title, description, author);
}

export function createGameEmbed(title, description, fields = [], author = null) {
  return embeds.game(title, description, fields, author);
}
