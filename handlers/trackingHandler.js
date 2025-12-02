import { getUser, updateUser } from "../utils/User.js";

const voiceTimestamps = new Map(); // userId -> start timestamp

function today() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export function setupTracking(client) {
  // ==========
  // MESSAGE TRACKING
  // ==========
  client.on("messageCreate", async (message) => {
    try {
      if (message.author.bot) return;
      if (!message.guild) return;

      const userId = message.author.id;
      const date = today();

      let user = await getUser(userId);

      // ========== LIFETIME messages ==========
      const lifetime = (user.messages || 0) + 1;

      // ========== DAILY messages ==========
      const dailyMessages = user.dailyMessages || {};
      dailyMessages[date] = (dailyMessages[date] || 0) + 1;

      // čuvamo poslednjih 14 dana
      const keys = Object.keys(dailyMessages).sort().slice(-14);
      const filteredDaily = {};
      for (const k of keys) filteredDaily[k] = dailyMessages[k];

      // ========== CHANNEL messages ==========
      const channelMessages = user.channelMessages || {};
      channelMessages[message.channel.id] =
        (channelMessages[message.channel.id] || 0) + 1;

      await updateUser(userId, {
        messages: lifetime,
        dailyMessages: filteredDaily,
        channelMessages
      });

    } catch (err) {
      console.error("messageCreate tracking error:", err);
    }
  });

  // ==========
  // VOICE TRACKING
  // ==========
  client.on("voiceStateUpdate", async (oldState, newState) => {
    try {
      const userId = newState.member.id;
      const date = today();

      // === ENTERED VC ===
      if (!oldState.channel && newState.channel) {
        voiceTimestamps.set(userId, Date.now());
      }

      // === LEFT VC ===
      if (oldState.channel && !newState.channel) {
        const start = voiceTimestamps.get(userId);
        if (start) {
          const seconds = Math.floor((Date.now() - start) / 1000);
          const user = await getUser(userId);

          const lifetime = (user.voiceTime || 0) + seconds;

          const dailyVoice = user.dailyVoice || {};
          dailyVoice[date] = (dailyVoice[date] || 0) + seconds;

          await updateUser(userId, {
            voiceTime: lifetime,
            dailyVoice
          });

          voiceTimestamps.delete(userId);
        }
      }

      // === SWITCH VC ===
      if (
        oldState.channel &&
        newState.channel &&
        oldState.channel.id !== newState.channel.id
      ) {
        const start = voiceTimestamps.get(userId);
        if (start) {
          const seconds = Math.floor((Date.now() - start) / 1000);
          const user = await getUser(userId);

          const lifetime = (user.voiceTime || 0) + seconds;

          const dailyVoice = user.dailyVoice || {};
          dailyVoice[date] = (dailyVoice[date] || 0) + seconds;

          await updateUser(userId, {
            voiceTime: lifetime,
            dailyVoice
          });

          // reset timer
          voiceTimestamps.set(userId, Date.now());
        }
      }
    } catch (err) {
      console.error("voiceStateUpdate tracking error:", err);
    }
  });

  console.log("✅ Tracking enabled (messages + voice + daily + channels via Mongo)");
}
