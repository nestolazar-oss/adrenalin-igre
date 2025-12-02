import { handleBan } from '../../handlers/moderationHandler.js';
import Embeds from '../../utils/embeds.js';

export const meta = {
  name: 'ban',
  aliases: ['b'],
  description: 'Banuj korisnika'
};

export async function execute(message, args) {
  const embeds = new Embeds(message.client);
  return await handleBan(message, args, embeds);
}

export default { meta, execute };