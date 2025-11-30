import { initUser, updateUser } from '../../utils/db.js';
import { FLAGS, getCountryCode } from '../../utils/constants.js';
import { createSuccessEmbed, createErrorEmbed, createWarningEmbed, createGameEmbed } from '../../utils/embeds.js';

export const meta = {
  name: 'flags',
  description: 'Pogađaj zastavu i zarađuj novac'
};

const activeGames = new Set();

export async function execute(message, args) {
  if (activeGames.has(message.channelId)) {
    return message.reply(`${emoji('error')} Već ima aktivne igre u ovom kanalu!`);
  }

  const user = initUser(message.author.id);
  const countries = Object.keys(FLAGS);
  const correctCountry = countries[Math.floor(Math.random() * countries.length)];
  const emoji_flag = FLAGS[correctCountry];

  const countryCode = getCountryCode(correctCountry);
  const flagUrl = `https://flagcdn.com/w320/${countryCode}.png`;

  const embed = createGameEmbed(
    `${emoji('flag')} Pogađaj Državu!`,
    'Koju državu predstavlja zastava? Pokušaj što više puta dok ne istekne vreme!',
    [
      { name: `${emoji('coins')} Nagrada`, value: '75$ - 100$ (brži = više)', inline: true },
      { name: `${emoji('timer')} Vremenski limit`, value: '10 sekundi', inline: true },
      { name: `${emoji('riddle_hint')} Savet`, value: 'Napiši naziv države ispod! Pokušavaj dok ne pogadiš!', inline: false }
    ]
  )
    .setImage(flagUrl)
    .setFooter({ text: `Mogućnosti: 193 zastave. Srećno!` });

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
      
      const correctEmbed = createSuccessEmbed(
        `${emoji('success')} Tačno!`,
        `<@${message.author.id}> je pogodio i zaradio **$${reward}**!\nDržava je bila **${correctCountry}** ${emoji_flag}`,
        message.author
      );

      message.channel.send({ embeds: [correctEmbed] });
      collector.stop();
    } else {
      const wrongEmbed = createErrorEmbed(
        `${emoji('error')} Netačno!`,
        'Pogrešan odgovor! Pokušaj ponovo!'
      );

      message.channel.send({ embeds: [wrongEmbed] });
    }
  });

  collector.on('end', () => {
    activeGames.delete(message.channelId);
    
    if (!answered) {
      const timeoutEmbed = createWarningEmbed(
        `${emoji('timer')} Vreme Isteklo!`,
        `Nisi pogodio na vreme!\nIspravna država je bila **${correctCountry}** ${emoji_flag}`,
        message.author
      );

      message.channel.send({ embeds: [timeoutEmbed] });
    }
  });
}