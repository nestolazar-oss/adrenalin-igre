// utils/ticketUtils.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AttachmentBuilder } from 'discord.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const TICKETS_DB_PATH = path.join(process.cwd(), 'data', 'tickets.json');

function ensureDB() {
  const dir = path.dirname(TICKETS_DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(TICKETS_DB_PATH)) fs.writeFileSync(TICKETS_DB_PATH, JSON.stringify({ channels: {}, users: {} }, null, 2));
}

export function loadTickets() {
  ensureDB();
  try {
    return JSON.parse(fs.readFileSync(TICKETS_DB_PATH, 'utf8'));
  } catch {
    return { channels: {}, users: {} };
  }
}

export function saveTickets(data) {
  ensureDB();
  fs.writeFileSync(TICKETS_DB_PATH, JSON.stringify(data, null, 2));
}

/**
 * createTranscriptTXT(channel, messages)
 * returns AttachmentBuilder
 */
export async function createTranscriptTXT(channel, messages) {
  // messages = array sorted asc (old -> new)
  let text = `=== TRANSCRIPT — ${channel.name} ===\n\n`;
  text += `Guild: ${channel.guild?.name || 'unknown'}\n`;
  text += `Channel: ${channel.name}\n`;
  text += `Generated: ${new Date().toLocaleString()}\n\n`;
  text += '=========================================\n\n';
  for (const m of messages) {
    const time = new Date(m.createdTimestamp).toLocaleString();
    const author = m.author?.tag || 'Unknown';
    let content = m.content || '';
    if (m.embeds?.length) content += ' [EMBED]';
    if (m.attachments?.size) {
      for (const a of m.attachments.values()) content += ` [ATTACH] ${a.url}`;
    }
    text += `[${time}] ${author}: ${content}\n`;
  }
  const buffer = Buffer.from(text, 'utf8');
  return new AttachmentBuilder(buffer, { name: `${channel.name}-transcript.txt` });
}

/**
 * createTranscriptHTML(channel, messages)
 * returns AttachmentBuilder
 */
export async function createTranscriptHTML(channel, messages) {
  // minimal self-contained HTML
  const inlineStyle = `
    body{font-family: Arial, Helvetica, sans-serif; background:#0e1116;color:#e6eef3}
    .wrap{max-width:900px;margin:20px auto;background:#0b1220;padding:16px;border-radius:8px;box-shadow:0 4px 18px rgba(0,0,0,.6)}
    .msg{padding:8px;margin-bottom:6px;border-radius:6px}
    .meta{font-size:12px;color:#9fb3c8}
    .content{margin-top:6px;white-space:pre-wrap}
    .author{font-weight:700}
  `;
  let html = `<!doctype html><html><head><meta charset="utf-8"><title>Transcript - ${channel.name}</title><style>${inlineStyle}</style></head><body><div class="wrap">`;
  html += `<h2>Transcript — ${channel.name}</h2>`;
  html += `<p class="meta">Guild: ${channel.guild?.name || 'unknown'} — Generated: ${new Date().toLocaleString()}</p><hr/>`;
  for (const m of messages) {
    const time = new Date(m.createdTimestamp).toLocaleString();
    html += `<div class="msg"><div class="meta"><span class="author">${escapeHtml(m.author?.tag || 'Unknown')}</span> • ${time}</div>`;
    let content = escapeHtml(m.content || '');
    if (m.embeds?.length) content += ' <em>[Embed]</em>';
    if (m.attachments?.size) {
      for (const a of m.attachments.values()) {
        content += `<div><a href="${a.url}" target="_blank">Attachment</a></div>`;
      }
    }
    html += `<div class="content">${content}</div></div>`;
  }
  html += `</div></body></html>`;
  const buffer = Buffer.from(html, 'utf8');
  return new AttachmentBuilder(buffer, { name: `${channel.name}-transcript.html` });
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * fetchMessages(channel, limitAll = 1000)
 * returns array of Messages sorted asc
 */
export async function fetchMessages(channel, limitAll = 500) {
  let fetched = [];
  let lastId;
  while (true) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;
    const batch = await channel.messages.fetch(options);
    if (!batch.size) break;
    fetched = fetched.concat(Array.from(batch.values()));
    lastId = batch.last().id;
    if (fetched.length >= limitAll) break;
  }
  fetched.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
  return fetched;
}

/**
 * appendLog(archiveChannel, embed, attachments)
 */
export async function appendLog(archiveChannel, embed, attachments=[]) {
  try {
    if (!archiveChannel) return;
    await archiveChannel.send({ embeds: [embed], files: attachments }).catch(() => {});
  } catch (e) { console.error('appendLog error', e); }
}
