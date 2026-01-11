import fetch from 'node-fetch';
import { SlashCommandBuilder } from 'discord.js';

import { admin } from './admin/main.mjs';
import getDate from './date.mjs';
import getRoleMembers from './rm.mjs';
import help from './help.mjs';
import { chatbot, createHistoryFile, getChatbotTextResponse, preserveHistory } from './chatbot.mjs';
import image from './image.mjs';
import music from './music.mjs';
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
                .setDescription("Width of the image. (Optional)")
        )
        .addIntegerOption(option =>
            option.setName("height")
                .setDescription("Height of the image. (Optional)")
        ),
    help: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Show all available commands and their usage details."),
    admin: new SlashCommandBuilder()
        .setName("admin")
        .setDescription("Execute admin commands. (Roles with 'ADMINISTRATOR' permission or permitted users/roles only)")
        .addSubcommand(subcommand =>
            subcommand
                .setName("init")
                .setDescription("Initialize the administrator commands.")
        )
        .addSubcommand(subcommand => 
            subcommand
                .setName("view-commands")
                .setDescription("View all available commands.")
        )
        .addSubcommand(subcommand => 
            subcommand
                .setName("del-commands")
                .setDescription("Delete a command.")
                .addStringOption(option => 
                    option.setName("commands")
                        .setDescription("Command name(s) or id(s) to delete, separated by space.")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand => 
            subcommand
                .setName("cls")
                .setDescription("Clear messages.")
                .addIntegerOption(option =>
                    option.setName("number")
                        .setDescription("A number of messages to clear. Omitted if you want to clear all messages.")
                )
        )
        .addSubcommand(subcommand => 
            subcommand
                .setName("grant")
                .setDescription("Grant admin permissions.")
                .addStringOption(option =>
                    option.setName("roles")
                        .setDescription("Role name(s) to add as permitted role(s) for admin commands.")
                )
                .addStringOption(option =>
                    option.setName("users")
                        .setDescription("Username(s) to add as permitted user(s) for admin commands.")
                )
        )
        .addSubcommand(subcommand => 
            subcommand
                .setName("revoke")
                .setDescription("Revoke admin permissions.")
                .addStringOption(option =>
                    option.setName("roles")
                        .setDescription("Role name(s) to revoke.")
                )
                .addStringOption(option =>
                    option.setName("users")
                        .setDescription("Username(s) to revoke.")
                )
        )
        .addSubcommand(subcommand => 
            subcommand
                .setName("whois")
                .setDescription("Show the list of users and roles that have been granted admin permission.")
        ),
    music: new SlashCommandBuilder()
        .setName("music")
        .setDescription("Search or Play music to your liking from various streaming services in the voice channel you're in.")
        .addSubcommand(subcommand =>
            subcommand
                .setName("search")
                .setDescription("Search top 5 music results for you to review and choose to play manually.")
                .addStringOption(option => 
                    option.setName("query")
                        .setRequired(true)
                        .setDescription("URL or keyword to search for music")
                )
                .addStringOption(option => 
                    option.setName("service")
                        .setDescription("Streaming service to play music from. (Optional)")
                        .addChoices(
                            { name: "YouTube", value: "yt" },
                            { name: "Spotify", value: "sp" },
                            { name: "SoundCloud", value: "sc" },
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("play")
                .setDescription("Play music from the top result of the search.")
                .addStringOption(option => 
                    option.setName("query")
                        .setRequired(true)
                        .setDescription("URL or keyword to search for music and play.")
                )
                .addStringOption(option => 
                    option.setName("service")
                        .setDescription("Streaming service to play music from. (Optional)")
                        .addChoices(
                            { name: "YouTube", value: "yt" },
                            { name: "Spotify", value: "sp" },
                            { name: "SoundCloud", value: "sc" },
                        )
                )
        )
        .addSubcommand(subcommand => 
            subcommand
                .setName("skip")
                .setDescription("Skip the current music.")
        )
        .addSubcommand(subcommand => 
            subcommand
                .setName("dropq")
                .setDescription("Delete the entire music queue and stop the music.")
        )
};

const command_funcs = {
    getDate,
    getRoleMembers,
    chatbot,
    image,
    help,
    admin,
    music
}

const utility_functions = {
    getChatbotTextResponse,
    createHistoryFile,
    preserveHistory
}

export default { commands_list, command_names, command_funcs, utility_functions, init };