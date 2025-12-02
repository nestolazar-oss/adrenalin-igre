const fs = require('fs');
const path = require('path');

function loadCommands(client) {
  client.commands = new Map();
  const commandsPath = path.join(__dirname, '..', 'commands');
  const files = getAllJsFiles(commandsPath);
  for (const file of files) {
    const cmd = require(file);
    if (!cmd) continue;
    const name = (cmd.data && (cmd.data.name || cmd.data.name?.toLowerCase())) || cmd.name || path.basename(file, '.js');
    client.commands.set(name, cmd);
  }
}

function getAllJsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) results = results.concat(getAllJsFiles(file));
    else if (file.endsWith('.js')) results.push(file);
  });
  return results;
}

module.exports = { loadCommands };