import { handleWarn } from '../../handlers/moderationHandler.js';
import Embeds from '../../utils/embeds.js';

export const meta = {
  name: 'warn',
  aliases: ['w'],
  description: 'Upozori korisnika'
};

export async function execute(message, args) {
  const embeds = new Embeds(message.client);
  return await handleWarn(message, args, embeds);
}

export default { meta, execute };