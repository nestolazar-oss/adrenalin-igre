// utils/resolveTikTokUrl.js
import fetch from "node-fetch";

export async function resolveTikTokUrl(url) {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    return res.url; // final redirected URL (real TikTok URL)
  } catch (e) {
    console.log("❌ Resolve error:", e.message);
    return url;
  }
}
