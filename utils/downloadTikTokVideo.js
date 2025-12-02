// utils/downloadTikTokVideo.js
import fs from "fs/promises";
import path from "path";
import fetch from "node-fetch";

const TEMP = "./downloads";

export async function downloadTikTokVideo(url) {
  await fs.mkdir(TEMP, { recursive: true });

  const apiURL = "https://tikwm.com/api/";

  const res = await fetch(apiURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0"
    },
    body: JSON.stringify({ url })
  });

  const data = await res.json().catch(() => null);

  if (!data || data.code !== 0) {
    console.log("❌ TikWM API error:", data);
    return null;
  }

  let videoUrl = data.data.play;

  // Fix TikWM bug:  "https//" → "https://"
  if (videoUrl.startsWith("https//")) {
    videoUrl = "https://" + videoUrl.slice(7);
  }

  // If TikWM returns only path, add domain
  if (videoUrl.startsWith("/")) {
    videoUrl = "https://tikwm.com" + videoUrl;
  }

  console.log("📥 Download URL:", videoUrl);

  const videoRes = await fetch(videoUrl, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });

  const buff = Buffer.from(await videoRes.arrayBuffer());

  if (buff.length < 5000) {
    console.log("❌ File too small");
    return null;
  }

  const filePath = path.join(TEMP, `tiktok_${Date.now()}.mp4`);
  await fs.writeFile(filePath, buff);

  console.log("✅ Saved:", filePath);
  return filePath;
}
