const mongoose = require('mongoose');

async function connect(uri, options = {}) {
  if (!uri) throw new Error('MONGO_URI is required');
  const defaultOpts = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    ...options
  };
  await mongoose.connect(uri, defaultOpts);
  mongoose.connection.on('connected', () => console.log('MongoDB connected'));
  mongoose.connection.on('error', err => console.error('MongoDB error', err));
  mongoose.connection.on('disconnected', () => console.log('MongoDB disconnected'));
  return mongoose.connection;
}

module.exports = { connect, mongoose };