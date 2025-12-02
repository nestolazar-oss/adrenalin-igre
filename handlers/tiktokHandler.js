// handlers/tiktokHandler.js
import { resolveTikTokUrl } from "../utils/resolveTikTokurl.js";
import { downloadTikTokVideo } from "../utils/downloadTikTokVideo.js";

export async function handleTikTokLinks(message) {
  if (message.author.bot) return;

  const match = message.content.match(/https?:\/\/\S+/);
  if (!match) return;

  let url = match[0];

  if (url.includes("vm.tiktok.com")) {
    url = await resolveTikTokUrl(url);
  }

  if (!url.includes("tiktok.com")) return;

  await message.delete().catch(() => {});

  // ❗ Sačuvaj poruku da možemo kasnije obrisati
  const loadingMsg = await message.channel.send("📥 Preuzimam TikTok...");

  const filePath = await downloadTikTokVideo(url);

  if (!filePath) {
    await loadingMsg.delete().catch(() => {});
    return message.channel.send("❌ Greška pri preuzimanju!");
  }

  await message.channel.send({
    content: `${emoji('linked')} TikTok Video | Poslao: ${message.author}`,
    files: [filePath]
  });

  // ❗ Obriši "Preuzimam TikTok..." kada je video poslat
  await loadingMsg.delete().catch(() => {});
}
