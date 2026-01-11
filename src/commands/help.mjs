import { EmbedBuilder } from "discord.js";
import { CommandList } from "../util.mjs";
import dotenv from 'dotenv';
dotenv.config();

export default async function help(interaction) {
    const cmdListForUser = new EmbedBuilder()
        .setColor("#ffffff")
        .setTitle("Commands Help Center")
        .setDescription("You can see the list of commands and how to use it here");

    const disco_api_url = `https://discord.com/api/v10/applications/${process.env.BOT_ID}/guilds/${interaction.guild.id}/commands`;
    const options = {
        method: 'GET',
        headers: {
            'Authorization': `Bot ${process.env.BOT_TOKEN}`,
            'Content-Type': 'application/json'
        },
    };
    const response = await fetch(disco_api_url, options);
    const data = await response.json();

    for (const cmd of data) CommandList.addCommandDataField(cmd, `/${cmd.name}`);
    const CommandEmbedListForUser = new CommandList({ f0r: "user", embed: cmdListForUser });
    for (const field of CommandEmbedListForUser.totalFields) if(!(CommandEmbedListForUser.construct({ field }))) break;

    // After the initial loop, if no break occurred and fields were added, push the page and set finished if no more
    if (CommandEmbedListForUser.thisPageFieldsMetadata.length > 0) {
        CommandEmbedListForUser.pages.push(CommandEmbedListForUser.thisPageFieldsMetadata);
        if (CommandEmbedListForUser.nextCmdId === null) { // All fit on first page
            CommandEmbedListForUser.onePageOnly();
        } else {
            CommandEmbedListForUser.thisPageFieldsMetadata = [];
        }
    }

    await interaction.editReply({ 
        embeds: [CommandEmbedListForUser.getEmbed()],
        components: [CommandEmbedListForUser.getCtrlBtns()],
        ephemeral: true,
        fetchReply: true
    });

    await CommandEmbedListForUser.registerControlBtn("user", interaction);
}