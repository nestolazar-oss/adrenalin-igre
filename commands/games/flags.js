import { initUser, updateUser } from '../../utils/db.js';
import { FLAGS, getCountryCode } from '../../utils/constants.js';
import { createSuccessEmbed, createErrorEmbed, createWarningEmbed, createGameEmbed } from '../../utils/embeds.js';

export const meta = {
  name: 'flags',
  description: 'Pogađaj zastavu i zarađuj novac'
};

const activeGames = new Set();

export async function execute(message, args) {
  // Proveri da li već postoji aktivna igra u ovom kanalu
  if (activeGames.has(message.channelId)) {
    return message.reply('❌ Već ima aktivne igre u ovom kanalu!');
  }

  // Inicijalizuj korisnika i odaberi random zemlju
  const user = initUser(message.author.id);
  const countries = Object.keys(FLAGS);
  const correctCountry = countries[Math.floor(Math.random() * countries.length)];
  const emoji = FLAGS[correctCountry];

  // Dohvati sliku zastave preko flagcdn.com API-ja
  const countryCode = getCountryCode(correctCountry);
  const flagUrl = `https://flagcdn.com/w320/${countryCode}.png`;

  // Kreiraj embed sa zastavom
  const embed = createGameEmbed(
    '🚩 Pogađaj Državu!',
    'Koju državu predstavlja zastava? Pokušaj što više puta dok ne istekne vreme!',
    [
      { name: '💰 Nagrada', value: '75$ - 100$ (brži = više)', inline: true },
      { name: '⏱️ Vremenski limit', value: '10 sekundi', inline: true },
      { name: '💡 Savet', value: 'Napiši naziv države ispod! Pokušavaj dok ne pogadiš!', inline: false }
    ]
  )
    .setImage(flagUrl)
    .setFooter({ text: `Mogućnosti: 193 zastave. Srećno!` });

  // Označi da je igra aktivna u ovom kanalu
  activeGames.add(message.channelId);

  await message.reply({ embeds: [embed] });

  // Filter - samo poruke od igrača koji je pokrenuo komandu
  const filter = m => m.author.id === message.author.id;
  
  // Collector - prikuplja poruke 10 sekundi (bez max limita)
  const collector = message.channel.createMessageCollector({ filter, time: 10000 });

  const startTime = Date.now();
  let answered = false;

  // Kada korisnik pošalje poruku
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
    'Tačno!',
    `<@${message.author.id}> je pogodio i zaradio **$${reward}**!\nDržava je bila **${correctCountry}** ${emoji}`,
    message.author  // ← OVO MORA BITI OVDE!
  );

  message.channel.send({ embeds: [correctEmbed] });
  collector.stop();
    } else {
      // POGREŠAN ODGOVOR - ali nastavi da prima pokušaje
      const wrongEmbed = createErrorEmbed(
        'Netačno!',
        'Pogrešan odgovor! Pokušaj ponovo!'
      );

      message.channel.send({ embeds: [wrongEmbed] });
      // NE ZAUSTAVLJAJ collector - igrač može da pokušava ponovo
    }
  });

  // Kad collector završi (prošlo je 10 sekundi ili je igrač pogodio)
  collector.on('end', () => {
    activeGames.delete(message.channelId); // Ukloni iz aktivnih igara
    
    // Ako vreme istekne i igrač nije pogodio
    if (!answered) {
      const timeoutEmbed = createWarningEmbed(
        'Vreme Isteklo!',
        `Nisi pogodio na vreme!\nIspravna država je bila **${correctCountry}** ${emoji}`,
        message.author  // ← I ovde dodaj
      );

      message.channel.send({ embeds: [timeoutEmbed] });
    }
  });
}