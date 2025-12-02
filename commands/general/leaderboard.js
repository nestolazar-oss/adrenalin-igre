// commands/general/leaderboard.js
import { renderLeaderboard } from '../../handlers/leaderboardButtonHandler.js';

export const meta = {
  name: 'leaderboard',
  aliases: ['lb', 'top'],
  description: 'Prikaži leaderboard'
};

export async function execute(message, args) {
  try {
    message._handled = true;
  } catch {}

  // Default: balance leaderboard
  const type = args[0] || 'balance';
  return renderLeaderboard(message, [type, 0], false);
}

export default { meta, execute };