import { handleKick } from '../../handlers/moderationHandler.js';
import Embeds from '../../utils/embeds.js';

export const meta = {
  name: 'kick',
  aliases: ['k'],
  description: 'Ukloni korisnika sa servera'
};

export async function execute(message, args) {
  const embeds = new Embeds(message.client);
  return await handleKick(message, args, embeds);
}

export default { meta, execute };