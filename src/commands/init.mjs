import fetch from 'node-fetch';
import { SlashCommandBuilder } from 'discord.js';

import { admin } from './admin/main.mjs';
import getDate from './date.mjs';
import getRoleMembers from './rm.mjs';
import help from './help.mjs';
import { chatbot, createHistoryFile, getChatbotTextResponse, preserveHistory } from './chatbot.mjs';
import image from './image.mjs';
import dotenv from 'dotenv';
dotenv.config();

let commands_list = new Map();

async function init(guildId=undefined){
    const disco_api_url = `https://discord.com/api/v10/applications/${process.env.BOT_ID}/${guildId ? `guilds/${guildId}/` : ''}commands`;
    const adding_commands = await fetch(disco_api_url, {
        method: 'PUT',
        headers: {
            'Authorization': `Bot ${process.env.BOT_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(Object.values(command_names).map(command => command.toJSON()))
    })

    const data = await adding_commands.json();

    if (adding_commands.ok) {
    //   console.log('Successfully added application (/) commands:', data);
        commands_list.set(guildId ? guildId : 'global', (() => {
            let cmds = new Map();
            for(const cmdData of data) cmds.set(cmdData.id, cmdData)
            return cmds;
        })());
    } else {
        console.error('Error adding application (/) commands:', data);
    }
};

const command_names = {
    getDate: new SlashCommandBuilder()
        .setName("date")
        .setDescription("Replying with today's date.")
        .setNameLocalizations({"th": "วันที่"})
        .setDescriptionLocalizations({ "th": "ตอบกลับด้วยวันที่วันนี้" }),
    getRoleMembers: new SlashCommandBuilder()
        .setName("rm")
        .setDescription("Show list of members in each role."),
    chatbot: new SlashCommandBuilder()
        .setName("chatbot")
        .setDescription("Enable/Disable chatbot behavior.")
        .addStringOption(option => 
            option.setName("action")
                .setRequired(true)
                .setDescription("Start/Stop the chatbot behavior.")
                .addChoices(
                    { name: "start", value: "start" },
                    { name: "stop", value: "stop" }
                )
        )
        .addStringOption(option => 
            option.setName("scope")
                .setDescription("Set the scope of the chatbot behavior, to act in the current channel, or in a new private channel.")
                .addChoices(
                    { name: "current", value: "c" },
                    { name: "private", value: "p" }
                )
        )
        .addStringOption(option => 
            option.setName("chatname")
                .setDescription("Set the name of the private channel.")
        ),
    image: new SlashCommandBuilder()
        .setName("image")
        .setDescription("Generate an image from a prompt.")
        .addStringOption(option => 
            option.setName("prompt")
                .setRequired(true)
                .setDescription("Prompt to generate an image from AI.")
        )
        .addIntegerOption(option =>
            option.setName("width")
                .setDescription("Width of the image.")
        )
        .addIntegerOption(option =>
            option.setName("height")
                .setDescription("Width of the image.")
        ),
    help: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Show all available commands and their usage details."),
    admin: new SlashCommandBuilder()
        .setName("admin")
        .addStringOption(option => 
            option.setName("command")
                .setDescription("Specify the admin command to execute.")
                .addChoices(
                    { name: "view-commands", value: "vc" },
                    { name: "del-command", value: "dc" },
                    { name: "cls", value: "cls" },
                    { name: "addmin", value: "addmin" }
                )
        )
        .addIntegerOption(option =>
            option.setName("number-of-messages")
                .setDescription("A number of messages to clear. Omitted if you want to clear all messages.")
        )
        .addStringOption(option => 
            option.setName("dc")
                .setDescription("Command name(s) or id(s) to delete, separated by space.")
        )
        .addStringOption(option =>
            option.setName("roles")
                .setDescription("Role name(s) to add as permitted role(s) for admin commands.")
        )
        .addStringOption(option =>
            option.setName("users")
                .setDescription("Username(s) to add as permitted user(s) for admin commands.")
        )
        .setDescription("Execute admin commands. (Roles with 'ADMINISTRATOR' permission or permitted users/roles only)"),
};

const command_funcs = {
    getDate,
    getRoleMembers,
    chatbot,
    image,
    help,
    admin
}

const utility_functions = {
    getChatbotTextResponse,
    createHistoryFile,
    preserveHistory
}

export default { commands_list, command_names, command_funcs, utility_functions, init };