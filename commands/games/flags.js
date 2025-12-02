import { initUser, updateUser } from '../../database/userDB.js';
import { FLAGS, getCountryCode } from '../../utils/constants.js';
import Embeds from '../../utils/embeds.js';
import { emoji } from '../../utils/emojis.js';

export const meta = {
  name: 'flags',
  description: 'Pogađaj zastavu i zarađuj novac'
};

const activeGames = new Set();

export async function execute(message, args) {
  if (activeGames.has(message.channelId)) {
    return message.reply(`${emoji('error')} Već ima aktivne igre u ovom kanalu!`);
  }

  const embeds = new Embeds(message.client);
  const user = initUser(message.author.id);
  const countries = Object.keys(FLAGS);
  const correctCountry = countries[Math.floor(Math.random() * countries.length)];
  const emoji_flag = FLAGS[correctCountry];
  const countryCode = getCountryCode(correctCountry);
  const flagUrl = `https://flagcdn.com/w320/${countryCode}.png`;

  const embed = embeds.custom({
    title: `${emoji('flag')} Pogađaj Državu!`,
    description: 'Koju državu predstavlja zastava? Pokušaj što više puta dok ne istekne vreme!',
    color: 0x3498DB,
    fields: [
      { name: `${emoji('coins')} Nagrada`, value: '75$ - 100$ (brži = više)', inline: true },
      { name: `${emoji('timer')} Vremenski limit`, value: '10 sekundi', inline: true },
      { name: `${emoji('info')} Savet`, value: 'Napiši naziv države ispod! Pokušavaj dok ne pogadiš!', inline: false }
    ],
    image: flagUrl,
    footer: 'Mogućnosti: 193 zastave. Srećno!'
  });

  activeGames.add(message.channelId);
  await message.reply({ embeds: [embed] });

  const filter = m => m.author.id === message.author.id;

  const collector = message.channel.createMessageCollector({ filter, time: 10000 });
  const startTime = Date.now();
  let answered = false;

  collector.on('collect', m => {
    const answer = m.content.trim();
    const correct = answer.toLowerCase() === correctCountry.toLowerCase();

    if (correct) {
      answered = true;
      const timeElapsed = (Date.now() - startTime) / 1000;
      const reward = Math.max(75, Math.floor(100 - (timeElapsed * 3)));
      user.cash += reward;
      updateUser(message.author.id, user);

      const correctEmbed = embeds.gameWin(`${emoji('trophy')} Tačno!`, {
        description: `<@${message.author.id}> je pogodio i zaradio!\nDržava je bila **${correctCountry}** ${emoji_flag}`,
        winAmount: reward,
        totalAmount: user.cash,
        author: message.author
      });

      message.channel.send({ embeds: [correctEmbed] });
      collector.stop();
    } else {
      const wrongEmbed = embeds.error(`${emoji('error')} Netačno!`, 'Pogrešan odgovor! Pokušaj ponovo!', message.author);
      message.channel.send({ embeds: [wrongEmbed] });
    }
  });

  collector.on('end', () => {
    activeGames.delete(message.channelId);

    if (!answered) {
      const timeoutEmbed = embeds.warning(
        `${emoji('clock')} Vreme Isteklo!`,
        `Nisi pogodio na vreme!\nIspravna država je bila **${correctCountry}** ${emoji_flag}`,
        message.author
      );
      message.channel.send({ embeds: [timeoutEmbed] });
    }
  });
}

export default { meta, execute };