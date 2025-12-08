import { EmbedBuilder } from "discord.js";
import { getCommandInputDataType } from "../util.mjs";
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
    for (const cmd of data) {
        let optionText = ""
        if (cmd.options) cmd.options.forEach((opt) => {
            if (opt.choices){
                let choice = opt.choices.map((c) => c.name);
                optionText += `\`${opt.name}: ${choice.join('|')}\` `
            }
            else optionText += `\`${opt.name}: ${getCommandInputDataType(opt.type)}\` `
        });
        cmdListForUser.addFields({ name: `/${cmd.name} ${optionText}`, value: (() => {
            if (cmd.options){
                return `${cmd.description}
                **Options**
                ${
                    cmd.options.map((opt) => {
                        if (opt.choices){
                            let choice = opt.choices.map((c) => `\`${c.name}\``);
                            return `\`${opt.name}\`: ${opt.description} Take input from the choices as ${choice.join('/')} ${opt.required ? "(Required)" : ""}`
                        }
                        else return `\`${opt.name}\`: ${opt.description} Take input as \`${getCommandInputDataType(opt.type)}\` ${opt.required ? "(Required)" : ""}`
                    }).join("\n")
                }`
            }
            else return cmd.description
        })() });
    }
    await interaction.followUp({ embeds: [cmdListForUser], ephemeral: true });
}