import fs from "fs"

async function genImage(prompt, width=1024, height=1024, model='flux') {
    const imageRequestUrl = `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${Math.random()}&model=${model}`;
    try {
        const response = await fetch(imageRequestUrl);
        // console.log(response, response.buffer);
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
        interaction.options.getInteger("width"),
        interaction.options.getInteger("height"),
    )
    if (errGen) {
        await interaction.followUp("Unable to generate image at the moment, please try again later");
    }
    else {
        await interaction.followUp({ files: [{ attachment: './image.png' }] });
        fs.rmSync('image.png');
    }
}