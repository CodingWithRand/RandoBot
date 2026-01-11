const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const { chatbotConfigs } = require('./commands/chatbot.mjs');
const fs = require('fs');
const { Player } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');
const { YoutubeSabrExtractor } = require('discord-player-googlevideo');
const { SpotifyExtractor } = require('discord-player-spotify');
const Commands = require('./commands/init.mjs').default;
require('dotenv').config();

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
	],
});

// Admin command initialization
const initted = new Map();
let granted_perm = {
    owner: null,
    admin: [],
    permitted: {
        roles: [],
        users: []
    }
};


if(!fs.existsSync('./admin_perm')) fs.mkdirSync('./admin_perm');

// Music player initialization

const player = new Player(client)

player.events.on('playerStart', (queue, track) => {
    queue.metadata.channel.send(`Started playing **${track.cleanTitle}**!`);
})

player.events.on("queueDelete", (queue) => {
    queue.metadata.channel.send("Queue finished");
})

player.events.on('playerError', (queue, error, track) => {
    queue.metadata.channel.send(`Error playing **${track.cleanTitle}**: ${error.message}, skipping.`);
    queue.node.skip();
})

client.once('ready', async () => {
    Commands.init();
    Commands.init(process.env.SERVER_ID); // for testing purpose, deleting it when deployed.
    console.log(`Logged in as ${client.user.tag}`);
    
    await player.extractors.loadMulti(DefaultExtractors);
    await player.extractors.register(SpotifyExtractor)
    await player.extractors.register(YoutubeSabrExtractor);

    // for testing only - prod use one in guildCreate event
    const guild = client.guilds.cache.get(process.env.SERVER_ID);
    if(fs.existsSync(`./admin_perm/${guild.name}.json`))
        granted_perm = JSON.parse(fs.readFileSync(`./admin_perm/${guild.name}.json`));
    else {
        const guild_members = await guild.members.fetch();
        granted_perm.owner = guild.ownerId;
        guild_members.forEach((gm) => {
            if(gm.permissions.has(PermissionsBitField.Flags.Administrator)) granted_perm.admin.push(gm.id);
        })
    }

    fs.writeFileSync(`./admin_perm/${guild.name}.json`, JSON.stringify(granted_perm));
});

client.on('guildCreate', async (guild) => {

    if(fs.existsSync(`./admin_perm/${guild.name}.json`)) {
        granted_perm = JSON.parse(fs.readFileSync(`./admin_perm/${guild.name}.json`));
    }

    await Commands.init(guild.id);
    const guild_members = await guild.members.fetch();
    granted_perm.owner = guild.ownerId;
    guild_members.forEach((gm) => {
        if(gm.permissions.has(PermissionsBitField.Flags.Administrator)) granted_perm.admin.push(gm.id);
    })

    fs.writeFileSync(`./admin_perm/${guild.name}.json`, JSON.stringify(granted_perm));
})
  
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;
    switch(interaction.commandName){
        case 'date': 
            await interaction.deferReply();
            if(Array.from(Commands.commands_list.get(interaction.guild.id), ([,cmdData]) => (cmdData)).findIndex(cmd => cmd.name === "date") === -1){
                await interaction.followUp({ content: "The command is not available in this server as it may have been deleted." });
                break;
            }
            await interaction.followUp(Commands.command_funcs.getDate(interaction));
            break;
        case 'rm':
            await interaction.deferReply({ ephemeral: true });
            if(Array.from(Commands.commands_list.get(interaction.guild.id), ([,cmdData]) => (cmdData)).findIndex(cmd => cmd.name === "rm") === -1){
                await interaction.followUp({ content: "The command is not available in this server as it may have been deleted." });
                break;
            }
            await interaction.followUp({ embeds: [await Commands.command_funcs.getRoleMembers(interaction.guild, "cmd-rm")], ephemeral: true });
            break;
        case 'chatbot':
            if(Array.from(Commands.commands_list.get(interaction.guild.id), ([,cmdData]) => (cmdData)).findIndex(cmd => cmd.name === "chatbot") === -1){
                await interaction.reply({ content: "The command is not available in this server as it may have been deleted." });
                break;
            }
            await Commands.command_funcs.chatbot(interaction);
            break;
        case 'image':
            interaction.deferReply({ timeout: 60000 });
            if(Array.from(Commands.commands_list.get(interaction.guild.id), ([,cmdData]) => (cmdData)).findIndex(cmd => cmd.name === "image") === -1){
                await interaction.followUp({ content: "The command is not available in this server as it may have been deleted." });
                break;
            }
            await Commands.command_funcs.image(interaction)
            break;
        case 'help':
            await interaction.deferReply({ ephemeral: true });
            await Commands.command_funcs.help(interaction);
            break;
        case 'admin':
            await interaction.deferReply({ ephemeral: true });
            await Commands.command_funcs.admin(interaction, initted, granted_perm);
            break;
        case 'music':
            await interaction.deferReply({ timeout: 60000 });
            if(Array.from(Commands.commands_list.get(interaction.guild.id), ([,cmdData]) => (cmdData)).findIndex(cmd => cmd.name === "music") === -1){
                await interaction.followUp({ content: "The command is not available in this server as it may have been deleted." });
                break;
            }
            await Commands.command_funcs.music(interaction)
            break;
    }  
});

// Chatbot message detection and response event handler
client.on('messageCreate', async (message) => {
    if(message.author.bot) return;

    const currentChannelConfig = chatbotConfigs[message.channel.id]
    if(!currentChannelConfig) return;
    if(!currentChannelConfig?.isActive) return;
    if(currentChannelConfig.isTyping) return;
    
    message.channel.sendTyping();
    currentChannelConfig.isTyping = true;
    const typingStatus = setInterval(() => {
        if(message.channel) message.channel.sendTyping();
        if(!currentChannelConfig?.isActive) clearInterval(typingStatus);
    }, 9000);

    const { ai_response, error } = await Commands.utility_functions.getChatbotTextResponse(message.content, currentChannelConfig.chatHistoryFile);
    if(ai_response){
        Commands.utility_functions.preserveHistory({ role: "user", content: message.content }, currentChannelConfig.chatHistoryFile);
        const resChunks = [];
        let currentChunk = '';
        let charCount = 0;
        for (const char of ai_response) {
            if (charCount >= 1960) {
                resChunks.push(currentChunk);
                currentChunk = char;
                charCount = 1;
            } else {
                currentChunk += char;
                charCount++;
            }
        }
        if (currentChunk) resChunks.push(currentChunk);
        message.channel.send(`${message.author.toString()}`);
        for (const chunk of resChunks) message.channel.send(chunk);
    }
    else message.channel.send("Unable to get AI response");
    currentChannelConfig.isTyping = false;
    clearInterval(typingStatus);
})


client.login(process.env.BOT_TOKEN);

// module.exports = {
//     global: {
//         initted, 
//         granted_perm 
//     }
// }