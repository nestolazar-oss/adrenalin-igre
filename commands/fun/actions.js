import { EmbedBuilder } from 'discord.js';
import GIF_API from '../../utils/gifApi.js';

const ACTIONS = {
  kiss: {
    queries: ['anime kiss', 'kissing'],
    messages: [
      (from, to) => `💋 ${from} je poljubio/la ${to}!`,
      (from, to) => `💋 ${from} i ${to} se smuvali!`,
      (from, to) => `💋 ${from} daje sladak poljubac ${to}!`,
    ]
  },
  hug: {
    queries: ['anime hug', 'hugging'],
    messages: [
      (from, to) => `🤗 ${from} je zagrlio/la ${to}!`,
      (from, to) => `🤗 ${from} je milovao/la ${to}!`,
      (from, to) => `🤗 ${from} čvrsto grli ${to}!`,
    ]
  },
  slap: {
    queries: ['anime slap', 'slapping'],
    messages: [
      (from, to) => `👋 ${from} je pljusnuo/la ${to}!`,
      (from, to) => `👋 ${from} je udario/la ${to}!`,
      (from, to) => `👋 ${from} je udario/la šamar ${to}!`
    ]
  },
  cuddle: {
    queries: ['anime cuddle', 'cuddling'],
    messages: [
      (from, to) => `🛌 ${from} se mazi sa ${to}!`,
      (from, to) => `🛌 ${from} se grli sa ${to}!`,
      (from, to) => `🛌 ${from} uživa u nežnom maženju sa ${to}!`,
      (from, to) => `🛌 ${from} i ${to} se grle i maze!`
    ]
  },
  pat: {
    queries: ['anime pat', 'patting head'],
    messages: [
      (from, to) => `🤚 ${from} je pomazio/la ${to} po glavi!`,
      (from, to) => `🤚 ${from} je milovao/la ${to}!`,
      (from, to) => `🤚 ${from} je tapšao/la ${to}!`
    ]
  },
  punch: {
    queries: ['anime punch', 'punching'],
    messages: [
      (from, to) => `👊 ${from} je udario/la ${to}!`,
      (from, to) => `👊 ${from} je udario/la pesnicom ${to}!`,
      (from, to) => `👊 ${from} nokautira ${to}!`,
    ]
  },
  dance: {
    queries: ['anime dance', 'dancing'],
    messages: [
      (from, to) => `💃 ${from} pleše sa ${to}!`,
      (from, to) => `💃 ${from} i ${to} plešu zajedno!`,
      (from, to) => `💃 ${from} je pozvao/la ${to} na ples!`
    ]
  },
  blush: {
    queries: ['anime blush', 'blushing'],
    messages: [
      (from, to) => `😊 ${from} se rumeni videvši ${to}!`,
      (from, to) => `😊 ${from} se pravi sramežljiv/a pred ${to}!`,
      (from, to) => `😊 ${from} se postidio/la videvši ${to}!`
    ]
  }
};


async function createActionCommand(actionName) {
  const action = ACTIONS[actionName];

  return {
    meta: {
      name: actionName,
      description: `Social akcija: ${actionName}`
    },
    execute: async function(message, args) {
      const target = message.mentions.users.first();

      if (!target) {
        return message.reply(`${emoji('error')} Označi korisnika! \`-${actionName} @user\``);
      }

      if (target.id === message.author.id) {
        return message.reply(`${emoji('error')} Ne možeš to da uradiš sam sebi!`);
      }

      if (target.bot) {
        return message.reply(`${emoji('error')} Ne možeš to da uradiš sa botom!`);
      }

      // Učitaj GIF
      const query = action.queries[Math.floor(Math.random() * action.queries.length)];
      const gifUrl = await GIF_API.random(query);

      if (!gifUrl) {
        return message.reply(`${emoji('error')} Nisam mogao pronaći GIF!`);
      }

      const messageFunc = action.messages[Math.floor(Math.random() * action.messages.length)];
      const description = messageFunc(message.author.tag, target.tag);

      const embed = new EmbedBuilder()
        .setColor(0xFF69B4)
        .setDescription(description)
        .setImage(gifUrl)
        .setFooter({ text: actionName.toUpperCase() })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }
  };
}

// Kreiraj sve akcije
const Kiss = await createActionCommand('kiss');
export const meta_kiss = Kiss.meta;
export const execute_kiss = Kiss.execute;

const Hug = await createActionCommand('hug');
export const meta_hug = Hug.meta;
export const execute_hug = Hug.execute;

const Slap = await createActionCommand('slap');
export const meta_slap = Slap.meta;
export const execute_slap = Slap.execute;

const Cuddle = await createActionCommand('cuddle');
export const meta_cuddle = Cuddle.meta;
export const execute_cuddle = Cuddle.execute;

const Pat = await createActionCommand('pat');
export const meta_pat = Pat.meta;
export const execute_pat = Pat.execute;

const Punch = await createActionCommand('punch');
export const meta_punch = Punch.meta;
export const execute_punch = Punch.execute;

const Dance = await createActionCommand('dance');
export const meta_dance = Dance.meta;
export const execute_dance = Dance.execute;

const Blush = await createActionCommand('blush');
export const meta_blush = Blush.meta;
export const execute_blush = Blush.execute;