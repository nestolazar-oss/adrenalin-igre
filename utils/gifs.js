// Simple gif mapping used by action commands. Add or replace with API based approach if you want.
module.exports = {
  kiss: [
    'https://media.giphy.com/media/G3va31oEEnIkM/giphy.gif',
    'https://media.giphy.com/media/zkppEMFvRX5FC/giphy.gif'
  ],
  ship: [
    'https://media.giphy.com/media/3oEduQAsYcJKQH2XsI/giphy.gif',
    'https://media.giphy.com/media/l2QDM9Jnim1YVILXa/giphy.gif'
  ],
  hug: [
    'https://media.giphy.com/media/l2QDM9Jnim1YVILXa/giphy.gif'
  ],
  randomFrom(type) {
    const arr = this[type] || [];
    return arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
  }
};