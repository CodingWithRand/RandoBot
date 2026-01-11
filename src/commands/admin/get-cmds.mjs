import https from "https"
import { EmbedBuilder } from 'discord.js';
import dotenv from 'dotenv';
import { CommandList } from "../../util.mjs";
dotenv.config();

export default async function getCommands(interaction, callback) {
    const disco_api_url = `https://discord.com/api/v10/applications/${process.env.BOT_ID}/guilds/${interaction.guild.id}/commands`;
    const options = {
        method: 'GET',
        headers: {
            'Authorization': `Bot ${process.env.BOT_TOKEN}`,
            'Content-Type': 'application/json'
        },
    };

    const req = https.request(disco_api_url, options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => responseData += chunk);
        res.on('end', () => { 
            if(res.statusCode === 200) callback({command_list: JSON.parse(responseData), status: true}, null)
            else callback({command_list: `Error: ${responseData} (Code: ${res.statusCode})`, status: false}, null)
        });
    });

    req.on('error', (error) => callback(null, error));
    req.end();

    const success = async (interaction, data=undefined) => {
        const cmdListEmbed = new EmbedBuilder()
            .setTitle("Command Details List")
            .setDescription("The following are details of each command available in the server")
            .setColor("#00aa00")

        const CommandEmbedListForAdmin = new CommandList({ f0r: "admin", embed: cmdListEmbed });
        for(const [cmdId, cmdDetail] of Object.entries(data)){
            if(!(CommandEmbedListForAdmin.construct({ cmdId, cmdDetail }))) break;
        }

        // After the initial loop, if no break occurred and fields were added, push the page and set finished if no more
        if (CommandEmbedListForAdmin.thisPageFieldsMetadata.length > 0) {
            CommandEmbedListForAdmin.pages.push(CommandEmbedListForAdmin.thisPageFieldsMetadata);
            if (CommandEmbedListForAdmin.nextCmdId === null) { // All fit on first page
                CommandEmbedListForAdmin.onePageOnly();
            } else {
                CommandEmbedListForAdmin.thisPageFieldsMetadata = [];
            }
        }

        await interaction.editReply({ 
            content: "Here are the list of commands details",
            embeds: [CommandEmbedListForAdmin.getEmbed()],
            components: [CommandEmbedListForAdmin.getCtrlBtns()],
            ephemeral: true,
            fetchReply: true
        });       
        
        await CommandEmbedListForAdmin.registerControlBtn("admin", interaction, data)
        
    };
    const error = async (interaction, data=undefined) => {
        await interaction.followUp({ content: `Couldn't show command details list at the moment\`\`\`${JSON.stringify(data)}\`\`\``, ephemeral: true });
    };

    return { success, error }
};