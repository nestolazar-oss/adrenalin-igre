import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import embeds from '../../utils/embeds.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SUGGESTIONS_FILE = path.join(__dirname, '../../data/suggestions.json');

async function ensureSuggestionsFile() {
  try {
    await fs.mkdir(path.dirname(SUGGESTIONS_FILE), { recursive: true });
    try {
      await fs.access(SUGGESTIONS_FILE);
    } catch {
      await fs.writeFile(SUGGESTIONS_FILE, JSON.stringify([], null, 2));
    }
  } catch (e) {
    console.error('Suggestions file error:', e);
  }
}

async function getSuggestions() {
  await ensureSuggestionsFile();
  try {
    const data = await fs.readFile(SUGGESTIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveSuggestions(suggestions) {
  await ensureSuggestionsFile();
  await fs.writeFile(SUGGESTIONS_FILE, JSON.stringify(suggestions, null, 2));
}

export const meta_suggestions = {
  name: 'suggestion',
  description: 'Upravljaj sugestijama'
};

export async function execute_suggestions(message, args) {
  const action = args[0]?.toLowerCase();

  if (action === 'create') {
    const text = args.slice(1).join(' ');

    if (!text) {
      return message.reply(embeds.error('Greška', `${emoji('error')} Koristi: \`-suggestion create <tekst>\``));
    }

    const suggestions = await getSuggestions();
    const suggestionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const suggestion = {
      id: suggestionId,
      author: message.author.tag,
      authorId: message.author.id,
      text,
      status: 'PENDING',
      upvotes: 0,
      downvotes: 0,
      timestamp: new Date().toISOString()
    };

    suggestions.push(suggestion);
    await saveSuggestions(suggestions);

    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle(`${emoji('success')} Sugestija Poslana`)
      .setDescription(text)
      .addFields(
        { name: 'Status', value: 'PENDING', inline: true },
        { name: 'ID', value: suggestionId, inline: true }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  if (action === 'accept') {
    if (!message.member.permissions.has('ManageGuild')) {
      return message.reply(embeds.error('Greška', `${emoji('reject')} Nemaš dozvolu!`));
    }

    const suggestionId = args[1];
    const suggestions = await getSuggestions();
    const suggestion = suggestions.find(s => s.id === suggestionId);

    if (!suggestion) {
      return message.reply(embeds.error('Greška', `${emoji('error')} Sugestija nije pronađena!`));
    }

    suggestion.status = 'ACCEPTED';
    await saveSuggestions(suggestions);

    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle(`${emoji('success')} Sugestija Odobrena`)
      .setDescription(suggestion.text)
      .addFields(
        { name: 'Autor', value: suggestion.author, inline: true },
        { name: 'Status', value: 'ACCEPTED', inline: true }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  if (action === 'deny') {
    if (!message.member.permissions.has('ManageGuild')) {
      return message.reply(embeds.error('Greška', `${emoji('reject')} Nemaš dozvolu!`));
    }

    const suggestionId = args[1];
    const suggestions = await getSuggestions();
    const suggestion = suggestions.find(s => s.id === suggestionId);

    if (!suggestion) {
      return message.reply(embeds.error('Greška', `${emoji('error')} Sugestija nije pronađena!`));
    }

    suggestion.status = 'DENIED';
    await saveSuggestions(suggestions);

    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`${emoji('reject')} Sugestija Odbijena`)
      .setDescription(suggestion.text)
      .addFields(
        { name: 'Autor', value: suggestion.author, inline: true },
        { name: 'Status', value: 'DENIED', inline: true }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  return message.reply(embeds.error('Greška', `${emoji('error')} Koristi: \`-suggestion <create|accept|deny> [tekst|id]\``));
}
