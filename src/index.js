const http = require('http');

// fake server
http.createServer((req, res) => {
  res.write('Bot is Online!');
  res.end();
}).listen(8080);


const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const { getChatbotConfigs } = require('./commands/chatbot.mjs');
const { default: mongoose } = require('mongoose');
const { AdminPermissions } = require('./schema.mjs');
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

// Admin command initialization ~~(ONE SERVER, NEED CHANGE)~~ Changed!
const initted = new Map(); // ok
const granted_perms = new Map();

// TODO: migrate to mongodb. Also look -> grant.mjs, rm.mjs [DONE]

async function adminPermInit(guild) {
    const adminPerm = await AdminPermissions.findOne({ gid: guild.id });
    let newAdminPerm = {
        owner: null,
        admins: [],
        permitted: {
            roles: [],
            users: []
        }
    };

    if(!adminPerm) {
        newAdminPerm.owner = guild.ownerId;
        const guild_members = await guild.members.fetch();
        guild_members.forEach((gm) => {
            if(gm.permissions.has(PermissionsBitField.Flags.Administrator)) newAdminPerm.admins.push(gm.id);
        })
        await AdminPermissions.create({ gid: guild.id, perms: newAdminPerm });
        granted_perms.set(guild.id, newAdminPerm);
    }
    else if(adminPerm && !granted_perms.has(guild.id)) {
        const guild_members = await guild.members.fetch();
        guild_members.forEach((gm) => {
            if(gm.permissions.has(PermissionsBitField.Flags.Administrator)) newAdminPerm.admins.push(gm.id);
        })
        newAdminPerm = {
            ...newAdminPerm,
            owner: adminPerm.perms.owner,
            permitted: adminPerm.perms.permitted
        }
        await AdminPermissions.findOneAndUpdate({ gid: guild.id }, { perms: newAdminPerm });
        granted_perms.set(guild.id, newAdminPerm);
    }
}

client.once('ready', async () => {
    await mongoose.connect(process.env.MONGODB_URI);

    // Auto init every time when update/restart.
    for(const guild of client.guilds.cache.values()) {
        await adminPermInit(guild);
        await Commands.init(guild.id);
    }
    console.log(`Logged in as ${client.user.tag}`);

    client.user.setPresence({
        activities: [{
            name: "Hi, I'm Daisey! Please to serve you! | /help",
        }],
        status: "online"
    })
});

client.on('guildCreate', async (guild) => {
    await adminPermInit(guild);
    await Commands.init(guild.id);
})
  
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    function checkUnavailability(commandName) {
        const thisGuildCommands = Commands.commands_list.get(interaction.guild.id);
        if (!thisGuildCommands) {
            console.log("Commands have not been initialized (somehow), reinitializing...");
            Commands.init(interaction.guild.id);
            return false;
        }
        return Array.from(thisGuildCommands, ([,cmdData]) => (cmdData)).findIndex(cmd => cmd.name === commandName) === -1;
    }

    switch(interaction.commandName){
        case 'date': 
            await interaction.deferReply();
            if(checkUnavailability("date")){
                await interaction.followUp({ content: "The command is not available in this server as it may have been deleted." });
                break;
            }
            await interaction.followUp(Commands.command_funcs.getDate(interaction));
            break;
        case 'rm':
            await interaction.deferReply({ ephemeral: true });
            if(checkUnavailability("rm")){
                await interaction.followUp({ content: "The command is not available in this server as it may have been deleted." });
                break;
            }
            await interaction.followUp({ embeds: [await Commands.command_funcs.getRoleMembers(interaction.guild, "cmd-rm")], ephemeral: true });
            break;
        case 'chatbot':
            if(checkUnavailability("chatbot")){
                await interaction.reply({ content: "The command is not available in this server as it may have been deleted." });
                break;
            }
            await Commands.command_funcs.chatbot(interaction);
            break;
        case 'image':
            await interaction.deferReply({ timeout: 60000 });
            if(checkUnavailability("image")){
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
            await Commands.command_funcs.admin(interaction, initted, granted_perms.get(interaction.guild.id));
            break;
        case 'music':
            await interaction.deferReply({ timeout: 60000 });
            if(checkUnavailability("music")){
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

    const currentChannelConfig = getChatbotConfigs(message.channel.id);
    if(!currentChannelConfig) return;
    if(!currentChannelConfig?.isActive) return;
    if(currentChannelConfig.isTyping) return;
    
    message.channel.sendTyping();
    currentChannelConfig.isTyping = true;
    const typingStatus = setInterval(() => {
        if(message.channel) message.channel.sendTyping();
        if(!currentChannelConfig?.isActive) clearInterval(typingStatus);
    }, 9000);

    const { ai_response, aiiid, error } = await Commands.utility_functions.getChatbotTextResponse(message.content, message, currentChannelConfig.userCreated);
    if(ai_response){
        await Commands.utility_functions.preserveHistory(aiiid, message, currentChannelConfig.userCreated); // ditch pollinations.ai, adopt gemini-2.5-flash-lite
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


client.login(process.env.DAISEY_BOT_TOKEN);

module.exports = {
    GrantedPerms: {
        set: (gid, perms) => granted_perms.set(gid, perms),
    }
}