import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { initUser, updateUser } from '../../utils/db.js';

export const meta = {
  name: 'trivia',
  aliases: ['quiz'],
  description: 'Trivia kviz - odgovori na pitanja i zarađuj novac'
};

const TRIVIA_QUESTIONS = [
  {
    category: 'Opšte Znanje',
    question: 'Koliko kontinenata ima na Zemlji?',
    answers: ['5', '6', '7', '8'],
    correct: 2,
    reward: 100
  },
  {
    category: 'Nauka',
    question: 'Koje je hemijsko označenje za zlato?',
    answers: ['Zn', 'Au', 'Ag', 'Fe'],
    correct: 1,
    reward: 120
  },
  {
    category: 'Filmovi',
    question: 'Koliko je filmova u serijali "Harry Potter"?',
    answers: ['6', '7', '8', '9'],
    correct: 2,
    reward: 100
  },
  {
    category: 'Geometrija',
    question: 'Koliko stepeni ima zbir uglova u trouglu?',
    answers: ['90°', '180°', '270°', '360°'],
    correct: 1,
    reward: 110
  },
  {
    category: 'Gaming',
    question: 'Koji god je ekvivalent za "Charizard"?',
    answers: ['Bulbasaur', 'Squirtle', 'Charmander', 'Pikachu'],
    correct: 2,
    reward: 100
  },
  {
    category: 'Opšte Znanje',
    question: 'Koji je najveći ocean na Zemlji?',
    answers: ['Atlantski', 'Indijski', 'Tihi', 'Severovledno ledeni'],
    correct: 2,
    reward: 100
  },
  {
    category: 'Nauka',
    question: 'Koliko kostiju ima ljudsko telo?',
    answers: ['186', '206', '226', '246'],
    correct: 1,
    reward: 120
  },
  {
    category: 'Opšte Znanje',
    question: 'Koja je prestonica Francuske?',
    answers: ['Marseille', 'Lyon', 'Pariz', 'Toulouse'],
    correct: 2,
    reward: 100
  }
];

const ANSWER_KEYS = ['A', 'B', 'C', 'D'];

export async function execute(message, args) {
  const user = initUser(message.author.id);
  
  const question = TRIVIA_QUESTIONS[Math.floor(Math.random() * TRIVIA_QUESTIONS.length)];
  let answered = false;
  let correct = false;
  
  const embed = new EmbedBuilder()
    .setColor(0x3498DB)
    .setTitle(`${emoji('trivia_question')} Trivia Pitanje`)
    .setDescription(`**${question.question}**`)
    .addFields(
      { name: 'Kategorija', value: question.category, inline: true },
      { name: 'Nagrada', value: `${emoji('cash')} $${question.reward}`, inline: true }
    )
    .setFooter({ text: `Vreme za odgovor: 30 sekundi` });
  
  const row = new ActionRowBuilder();
  for (let i = 0; i < 4; i++) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`trivia_ans_${i}_${message.author.id}`)
        .setLabel(`${ANSWER_KEYS[i]}: ${question.answers[i]}`)
        .setStyle(ButtonStyle.Secondary)
    );
  }
  
  const msg = await message.reply({
    embeds: [embed],
    components: [row]
  });
  
  const collector = msg.createMessageComponentCollector({
    time: 30000,
    filter: i => i.user.id === message.author.id
  });
  
  collector.on('collect', async (interaction) => {
    if (answered) return interaction.deferUpdate();
    
    answered = true;
    const answerIndex = parseInt(interaction.customId.split('_')[2]);
    correct = answerIndex === question.correct;
    
    let resultEmbed;
    
    if (correct) {
      user.cash += question.reward;
      updateUser(message.author.id, user);
      
      resultEmbed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle(`${emoji('trivia_correct')} TAČNO!`)
        .setDescription(`Odabrao si: **${ANSWER_KEYS[answerIndex]}: ${question.answers[answerIndex]}**\n\nZaradio si: ${emoji('cash')} **${question.reward}**`)
        .addFields(
          { name: 'Tvoja nova gotovina', value: `${user.cash.toLocaleString()}`, inline: false }
        );
    } else {
      resultEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle(`${emoji('trivia_wrong')} POGREŠNO!`)
        .setDescription(`Odabrao si: **${ANSWER_KEYS[answerIndex]}: ${question.answers[answerIndex]}**\n\nIspravan odgovor je: **${ANSWER_KEYS[question.correct]}: ${question.answers[question.correct]}**`)
        .addFields(
          { name: 'Tvoja gotovina', value: `${user.cash.toLocaleString()}`, inline: false }
        );
    }
    
    const disabledRow = new ActionRowBuilder();
    for (let i = 0; i < 4; i++) {
      let style = ButtonStyle.Secondary;
      
      if (i === question.correct) style = ButtonStyle.Success;
      if (i === answerIndex && !correct) style = ButtonStyle.Danger;
      
      disabledRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`trivia_ans_${i}_${message.author.id}`)
          .setLabel(`${ANSWER_KEYS[i]}: ${question.answers[i]}`)
          .setStyle(style)
          .setDisabled(true)
      );
    }
    
    try {
      await interaction.update({
        embeds: [resultEmbed],
        components: [disabledRow]
      });
    } catch (e) {}
    
    collector.stop();
  });
  
  collector.on('end', () => {
    if (!answered) {
      const timeoutEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle(`${emoji('timer')} Vreme Isteklo`)
        .setDescription(`Nisi odgovorio/la na vreme!\n\nIspravan odgovor je: **${ANSWER_KEYS[question.correct]}: ${question.answers[question.correct]}**`);
      
      msg.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
    }
  });
}