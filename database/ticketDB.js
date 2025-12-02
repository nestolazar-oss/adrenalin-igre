// database/ticketDB.js (NEW)
import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema({
  channelId: { type: String, required: true, unique: true },
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  type: { type: String, enum: ['support', 'report', 'partner'], default: 'support' },
  
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  
  claimedBy: { type: String, default: null },
  claimedAt: { type: Date, default: null },
  
  createdAt: { type: Date, default: Date.now },
  closedAt: { type: Date, default: null },
  
  members: [String],
  messageCount: { type: Number, default: 0 }
}, { timestamps: true });

const Ticket = mongoose.model("Ticket", ticketSchema);

export async function createTicket(channelId, guildId, userId, type = 'support') {
  return await Ticket.create({
    channelId,
    guildId,
    userId,
    type,
    members: [userId]
  });
}

export async function getTicket(channelId) {
  return await Ticket.findOne({ channelId });
}

export async function closeTicket(channelId) {
  return await Ticket.findOneAndUpdate(
    { channelId },
    { status: 'closed', closedAt: new Date() },
    { new: true }
  );
}

export async function addMember(channelId, userId) {
  return await Ticket.findOneAndUpdate(
    { channelId },
    { $addToSet: { members: userId } },
    { new: true }
  );
}

export async function removeMember(channelId, userId) {
  return await Ticket.findOneAndUpdate(
    { channelId },
    { $pull: { members: userId } },
    { new: true }
  );
}

export async function claimTicket(channelId, userId) {
  return await Ticket.findOneAndUpdate(
    { channelId },
    { claimedBy: userId, claimedAt: new Date() },
    { new: true }
  );
}

export async function updatePriority(channelId, priority) {
  return await Ticket.findOneAndUpdate(
    { channelId },
    { priority },
    { new: true }
  );
}

export async function getGuildTickets(guildId, status = 'open') {
  return await Ticket.find({ guildId, status });
}

export default {
  createTicket,
  getTicket,
  closeTicket,
  addMember,
  removeMember,
  claimTicket,
  updatePriority,
  getGuildTickets
};