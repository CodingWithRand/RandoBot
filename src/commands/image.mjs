import fs from "fs"

// Tier Spore 🍄
// + 0.01 pollen / hour
// - 0.001 pollen / image
// -> 10 images 
async function genImage(prompt, width=1024, height=1024, model='flux', enhance=true) {
    const imageRequestUrl = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${Math.floor(Math.random() * 1e9)}&model=${model}&enhance=${enhance}&key=${process.env.POLLINATION_AI_KEY}`;
    try {
        const response = await fetch(imageRequestUrl);
        if(!response.ok) throw new Error(`Image generation failed with status ${response.status}`);
        const buffer = Buffer.from(await response.arrayBuffer());

        fs.writeFileSync('image.png', buffer);
        return null
    } catch (error) {
        console.error(error);
        return error
    }
}

export default async function image(interaction) {
    const errGen = await genImage(
        interaction.options.getString("prompt"),
        interaction.options.getInteger("width") ?? 1024,
        interaction.options.getInteger("height") ?? 1024,
    )
    if (errGen) {
        await interaction.followUp("Unable to generate image at the moment, please try again later");
    }
    else {
        await interaction.followUp({ files: [{ attachment: './image.png' }] });
        fs.rmSync('image.png');
    }
}