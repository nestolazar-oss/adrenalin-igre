import { EmbedBuilder } from 'discord.js';
import {
  createSuggestion,
  updateSuggestionStatus,
  findSuggestion,
  getSuggestionsByStatus
} from '../../handlers/suggestionsHandler.js';
import Embeds from '../../utils/embeds.js';
import { emoji } from '../../utils/emojis.js';

export const meta = {
  name: 'suggestion',
  aliases: ['sug', 'suggest'],
  description: 'Upravljaj sugestijama'
};

export async function execute(message, args) {
  const embeds = new Embeds(message.client);
  const action = args[0]?.toLowerCase();

  if (action === 'create') {
    const text = args.slice(1).join(' ');

    if (!text || text.length < 5) {
      return message.reply({
        embeds: [embeds.error('Greška', `${emoji('error')} Koristi: \`-suggestion create <tekst>\`\nMinimalno 5 karaktera.`)]
      });
    }

    const suggestion = await createSuggestion(text, message.author.id, message.author.tag);

    const embed = embeds.custom({
      title: `${emoji('success')} Sugestija Poslana`,
      description: text,
      color: 0x2ECC71,
      fields: [
        { name: 'Status', value: 'PENDING', inline: true },
        { name: 'ID', value: suggestion.id, inline: true }
      ]
    });

    return message.reply({ embeds: [embed] });
  }

  if (action === 'accept') {
    if (!message.member.permissions.has('ManageGuild')) {
      return message.reply({
        embeds: [embeds.error('Greška', `${emoji('reject')} Nemaš dozvolu!`)]
      });
    }

    const suggestionId = args[1];
    if (!suggestionId) {
      return message.reply({
        embeds: [embeds.error('Greška', `${emoji('error')} Koristi: \`-suggestion accept <ID>\``)]
      });
    }

    const suggestion = await updateSuggestionStatus(suggestionId, 'ACCEPTED');

    if (!suggestion) {
      return message.reply({
        embeds: [embeds.error('Greška', `${emoji('error')} Sugestija nije pronađena!`)]
      });
    }

    const embed = embeds.custom({
      title: `${emoji('success')} Sugestija Odobrena`,
      description: suggestion.text,
      color: 0x2ECC71,
      fields: [
        { name: 'Autor', value: suggestion.author, inline: true },
        { name: 'Status', value: 'ACCEPTED', inline: true }
      ]
    });

    return message.reply({ embeds: [embed] });
  }

  if (action === 'deny') {
    if (!message.member.permissions.has('ManageGuild')) {
      return message.reply({
        embeds: [embeds.error('Greška', `${emoji('reject')} Nemaš dozvolu!`)]
      });
    }

    const suggestionId = args[1];
    if (!suggestionId) {
      return message.reply({
        embeds: [embeds.error('Greška', `${emoji('error')} Koristi: \`-suggestion deny <ID>\``)]
      });
    }

    const suggestion = await updateSuggestionStatus(suggestionId, 'DENIED');

    if (!suggestion) {
      return message.reply({
        embeds: [embeds.error('Greška', `${emoji('error')} Sugestija nije pronađena!`)]
      });
    }

    const embed = embeds.custom({
      title: `${emoji('reject')} Sugestija Odbijena`,
      description: suggestion.text,
      color: 0xE74C3C,
      fields: [
        { name: 'Autor', value: suggestion.author, inline: true },
        { name: 'Status', value: 'DENIED', inline: true }
      ]
    });

    return message.reply({ embeds: [embed] });
  }

  if (action === 'list' || action === 'pending') {
    const status = action === 'pending' ? 'PENDING' : args[1]?.toUpperCase() || 'PENDING';
    const suggestions = await getSuggestionsByStatus(status);

    if (suggestions.length === 0) {
      return message.reply({
        embeds: [embeds.info('Info', `Nema sugestija sa statusom: **${status}**`)]
      });
    }

    const description = suggestions
      .slice(0, 10)
      .map((s, i) => `\`${i + 1}.\` **${s.id}** - ${s.text.slice(0, 50)}... (${s.author})`)
      .join('\n');

    const embed = embeds.custom({
      title: `${emoji('menu')} Sugestije - ${status}`,
      description,
      color: 0x3498DB
    });

    return message.reply({ embeds: [embed] });
  }

  const helpEmbed = embeds.custom({
    title: `${emoji('info')} Sugestije - Help`,
    description: `\`-suggestion create <tekst>\` - Kreiraj sugestiju\n\`-suggestion accept <ID>\` - Odobri sugestiju\n\`-suggestion deny <ID>\` - Odbij sugestiju\n\`-suggestion list [STATUS]\` - Prikaži sugestije\n\`-suggestion pending\` - Prikaži pending sugestije`,
    color: 0x3498DB
  });

  return message.reply({ embeds: [helpEmbed] });
}

export default { meta, execute };