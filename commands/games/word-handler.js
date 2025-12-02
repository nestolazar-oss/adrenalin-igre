import { generateWordRoundImage, generateWordVictoryImage } from "./word-canvas.js";

export async function handleWordGame(message, gameState) {
    try {
        if (!gameState.active) return;

        const guess = message.content.trim().toLowerCase();

        // 🎯 POGODIO REČ
        if (guess === gameState.correctWord.toLowerCase()) {

            const buffer = await generateWordVictoryImage(
                message.author.username,
                gameState.time,
                message.author.displayAvatarURL({ extension: "png" }),
                gameState.correctWord
            );

            await message.channel.send({
                files: [{ attachment: buffer, name: "victory.png" }]
            });

            gameState.active = false;
            return;
        }

        // ❌ GREŠKA — GENERIŠE SE ROUND CANVAS (ALI SA VALIDNIM PARAMETRIMA)
        const buffer = await generateWordRoundImage(
            gameState.correctWord,
            gameState.correctWord.length,
            gameState.seconds,
            gameState.difficulty
        );

        await message.channel.send({
            files: [{ attachment: buffer, name: "round.png" }]
        });

    } catch (err) {
        console.error("Word handler error:", err);
    }
}
