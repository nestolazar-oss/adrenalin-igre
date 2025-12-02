import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },

  // lifetime
  messages: { type: Number, default: 0 },
  voiceTime: { type: Number, default: 0 },

  // daily tracking (1d/7d/14d)
  dailyMessages: { type: Object, default: {} },
  dailyVoice: { type: Object, default: {} },

  // channel tracking
  channelMessages: { type: Object, default: {} }
}, { timestamps: true }); // <-- dodaje createdAt & updatedAt
                         // vrlo korisno za stats komande

export default mongoose.models.User || mongoose.model("User", UserSchema);
