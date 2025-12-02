import User from "../database/models/User.js";

export async function getUser(userId) {
  let user = await User.findOne({ userId });
  if (!user) user = await User.create({ userId });
  return user;
}

export async function updateUser(userId, data) {
  return await User.findOneAndUpdate(
    { userId },
    { $set: data },
    { new: true, upsert: true }
  );
}

export async function incrementUser(userId, data) {
  return await User.findOneAndUpdate(
    { userId },
    { $inc: data },
    { new: true, upsert: true }
  );
}
