import { EmbedBuilder } from 'discord.js';
import { initUser, updateUser } from '../../database/userDB.js';

export const meta = {
  name: 'riddle',
  aliases: ['zagonetka', 'rid'],
  description: 'Riddle igra - pogdi zagonetku i zarađuj novac'
};

const RIDDLES = [
  {
    riddle: 'Šta je crno, ima Sunčev sjaj, a nikad nije izloženo Suncu?',
    answer: 'senka',
    hints: ['Nastaje kada nešto blokira svetlo', 'Vidiš je u tamnim sobama'],
    reward: 150
  },
  {
    riddle: 'Imam gradove, ali nema kuća. Imam planine, ali nema drveća. Šta sam?',
    answer: 'mapa',
    hints: ['Koristi se za putovanje', 'Pokazuje geografske lokacije'],
    reward: 150
  },
  {
    riddle: 'Šta ima glavu i rep, ali nema tela?',
    answer: 'novac',
    hints: ['Koristi se za kupovanje', 'Ima lice sa jedne strane'],
    reward: 150
  },
  {
    riddle: 'Mogu putovati po svetu, a nikad ne napuštam svoj ugao. Šta sam?',
    answer: 'marka',
    hints: ['Koristi se za slanje pisama', 'Lepljiva je'],
    reward: 150
  },
  {
    riddle: 'Šta se nikad ne boji, ali svaka boja joj je potrebna?',
    answer: 'duga',
    hints: ['Pojavljuje se nakon kiše', 'Ima šest do sedam boja'],
    reward: 150
  },
  {
    riddle: 'Šta ima vrata, ali se ne može ući i izaći kroz njih?',
    answer: 'frižider',
    hints: ['Električni uređaj', 'Koristi se za čuvanje hrane'],
    reward: 150
  },
  {
    riddle: 'Šta se može videti na dan i noć, ali je nema kada je Sunce tačno iznad tebe?',
    answer: 'senka',
    hints: ['Nastaje zbog svetla', 'Tvoja replika na zemlji'],
    reward: 150
  },
  {
    riddle: 'Ja sam kući, ali mogu biti bilo gde. Šta sam?',
    answer: 'telefon',
    hints: ['Koristi se za komunikaciju', 'Nosiš me sa sobom'],
    reward: 150
  }
];

function normalizeAnswer(text) {
  return text.toLowerCase().trim().replace(/[^a-zčćžšđ]/g, '');
}

export async function execute(message, args) {
  const user = initUser(message.author.id);
  
  const riddle = RIDDLES[Math.floor(Math.random() * RIDDLES.length)];
  const normalizedAnswer = normalizeAnswer(riddle.answer);
  
  let answered = false;
  let hintsUsed = 0;
  let startTime = Date.now();
  
  const createEmbed = () => {
    const timeLeft = Math.max(0, Math.ceil((120000 - (Date.now() - startTime)) / 1000));
    
    return new EmbedBuilder()
      .setColor(0xF39C12)
      .setTitle(`${emoji('riddle_hint')} Zagonetka`)
      .setDescription(`**${riddle.riddle}**`)
      .addFields(
        { name: `${emoji('timer')} Vreme`, value: `${timeLeft}s`, inline: true },
        { name: `${emoji('riddle_hint')} Hintu Korišćeno`, value: `${hintsUsed}/${riddle.hints.length}`, inline: true },
        { name: 'Nagrada', value: `${emoji('cash')} $${riddle.reward}`, inline: true }
      )
      .setFooter({ text: 'Piši odgovor u chatu. Koristi `-hint` za savet!' });
  };
  
  const msg = await message.reply({
    embeds: [createEmbed()]
  });
  
  const filter = m => m.author.id === message.author.id;
  const collector = message.channel.createMessageCollector({ filter, time: 120000 });
  
  collector.on('collect', async (m) => {
    if (answered) return;
    
    if (m.content.toLowerCase() === '-hint') {
      if (hintsUsed < riddle.hints.length) {
        const hintEmbed = new EmbedBuilder()
          .setColor(0xF39C12)
          .setTitle(`${emoji('riddle_hint')} Savet ${hintsUsed + 1}`)
          .setDescription(riddle.hints[hintsUsed]);
        
        await m.reply({ embeds: [hintEmbed] });
        hintsUsed++;
        
        await msg.edit({ embeds: [createEmbed()] }).catch(() => {});
      } else {
        await m.reply(`${emoji('warning')} Nema više saveta dostupnih!`);
      }
      return;
    }
    
    const userAnswer = normalizeAnswer(m.content);
    
    if (userAnswer === normalizedAnswer) {
      answered = true;
      collector.stop();
      
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);
      const reward = Math.max(50, riddle.reward - (hintsUsed * 20));
      
      user.cash += reward;
      updateUser(message.author.id, user);
      
      const winEmbed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle(`${emoji('riddle_solved')} TAČNO!`)
        .setDescription(`Odgovor je bio: **${riddle.answer}**\n\n${emoji('cash')} Zarada: **$${reward}**`)
        .addFields(
          { name: 'Vreme', value: `${timeTaken}s`, inline: true },
          { name: 'Korišćeni Saveti', value: `${hintsUsed}`, inline: true },
          { name: 'Nova Gotovina', value: `$${user.cash.toLocaleString()}`, inline: true }
        );
      
      await m.reply({ embeds: [winEmbed] });
    } else {
      const hintEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle(`${emoji('warning')} Pogrešno!`)
        .setDescription('Pokušaj ponovo ili koristi `-hint` za savet.');
      
      await m.reply({ embeds: [hintEmbed] });
    }
  });
  
  collector.on('end', () => {
    if (!answered) {
      const timeoutEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle(`${emoji('riddle_failed')} Vreme Isteklo`)
        .setDescription(`Odgovor je bio: **${riddle.answer}**`);
      
      msg.reply({ embeds: [timeoutEmbed] }).catch(() => {});
    }
  });
}