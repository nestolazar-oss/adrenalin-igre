const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

async function deploy(clientId, guildId, token, commandsPath, global = false) {
  const commands = [];
  const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const cmd = require(path.join(commandsPath, file));
    if (!cmd || !cmd.data) continue;
    commands.push(cmd.data.toJSON ? cmd.data.toJSON() : cmd.data);
  }
  const rest = new REST({ version: '10' }).setToken(token);
  if (!global && guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
  }
}

module.exports = { deploy };