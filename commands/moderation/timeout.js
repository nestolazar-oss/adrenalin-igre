import { handleTimeout } from '../../handlers/moderationHandler.js';
import Embeds from '../../utils/embeds.js';

export const meta = {
  name: 'timeout',
  aliases: ['mute', 'tm'],
  description: 'Timeout korisnika'
};

export async function execute(message, args) {
  const embeds = new Embeds(message.client);
  return await handleTimeout(message, args, embeds);
}

export default { meta, execute };