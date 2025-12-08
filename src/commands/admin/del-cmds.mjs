import Commands from "../../commands/init.mjs"
import dotenv from 'dotenv';
dotenv.config();

export default async function delCommand(interaction, cmdId){
    let fetchingStatus = true;
    let fetchResult;

    for(const id of cmdId){
        const disco_api_url = `https://discord.com/api/v10/applications/${process.env.BOT_ID}/guilds/${interaction.guild.id}/commands/${id}`;
        const del_commands = await fetch(disco_api_url, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bot ${process.env.BOT_TOKEN}`,
                'Content-Type': 'application/json'
            },
        })
        if(!del_commands.ok){ fetchingStatus = false }
        else{
            Commands.commands_list.get(interaction.guild.id).delete(`${cmdId}`);
        }
        try {
            fetchResult = await del_commands.json();
        } catch {}
    }

    const success = async (interaction, data=undefined) => {
        await interaction.followUp({ content: "Successfully delete the command!", ephemeral: true});
        if(data) await interaction.followUp(`\`\`\`${data}\`\`\``);
    };
    const error = async (interaction, data=undefined) => {
        await interaction.followUp({ content: `Couldn't delete the command at the moment\`\`\`${JSON.stringify(data)}\`\`\``, ephemeral: true });
    };

    return { success, error, fetchingStatus, fetchResult }
}