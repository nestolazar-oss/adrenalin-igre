import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SUGGESTIONS_FILE = path.join(__dirname, '../data/suggestions.json');

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

export async function getSuggestions() {
  await ensureSuggestionsFile();
  try {
    const data = await fs.readFile(SUGGESTIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveSuggestions(suggestions) {
  await ensureSuggestionsFile();
  await fs.writeFile(SUGGESTIONS_FILE, JSON.stringify(suggestions, null, 2));
}

export async function createSuggestion(text, authorId, authorTag) {
  const suggestions = await getSuggestions();
  const suggestionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const suggestion = {
    id: suggestionId,
    author: authorTag,
    authorId,
    text,
    status: 'PENDING',
    upvotes: 0,
    downvotes: 0,
    timestamp: new Date().toISOString()
  };

  suggestions.push(suggestion);
  await saveSuggestions(suggestions);

  return suggestion;
}

export async function updateSuggestionStatus(suggestionId, newStatus) {
  const suggestions = await getSuggestions();
  const suggestion = suggestions.find(s => s.id === suggestionId);

  if (!suggestion) return null;

  suggestion.status = newStatus;
  await saveSuggestions(suggestions);

  return suggestion;
}

export async function findSuggestion(suggestionId) {
  const suggestions = await getSuggestions();
  return suggestions.find(s => s.id === suggestionId);
}

export async function getSuggestionsByStatus(status) {
  const suggestions = await getSuggestions();
  return suggestions.filter(s => s.status === status);
}

export default {
  getSuggestions,
  saveSuggestions,
  createSuggestion,
  updateSuggestionStatus,
  findSuggestion,
  getSuggestionsByStatus
};