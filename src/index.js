const http = require('http');

// fake server
http.createServer((req, res) => {
  res.write('Bot is Online!');
  res.end();
}).listen(8080);

// const { ProxyAgent, setGlobalDispatcher, fetch } = require('undici');

// const proxyAgent =  new ProxyAgent("http://having-relevant.gl.joinmc.link")

// setGlobalDispatcher(proxyAgent);

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
    Commands.init();
    // Commands.init(process.env.SERVER_ID); // for testing purpose, deleting it when deployed.
    console.log(`Logged in as ${client.user.tag}`);

    await mongoose.connect(process.env.MONGODB_URI);

    client.user.setPresence({
        activities: [{
            name: "Hi, I'm Daisey! Please to serve you! | /help",
        }],
        status: "online"
    })

    // I have tried every way. Researched everything. There is no way to avoid IP block from YouTube and SoundCloud, so I may have to use proxy server, with my own pc.
    // TODO: implement consistent (url) proxy, and unlimited bandwidth (if possible) for free and add it here.
    // Tried: cloudflared ❌, localtunnel ❌, ngrok ❌😔, serveo ❌ playit.gg (tcp) ❌

    // Takeaway:
    // - passing headers in ProxyAgent mean passing it to the destination server, not to the proxy server.
    // - the solution with igops/ngrok-skip-browser-warning:latest repo only work with normal fetch method (CRUD). WHICH the proxy agent do CONNECT tunneling.
    // - TCP MIGHT be the way. By opening raw tunnel connection between your local to the destination server with the proxy is just the tunnel.
    // - no free proxy service provide unlimited bandwidth and consistent url -> run the music command locally would be a better option, until i decide to port my bot to raspberry pi.


    // await player.extractors.register(YoutubeExtractor)
    // , {
    //     cookie: process.env.YT_COOKIES,
    //     proxy: proxyAgent,
    //     generateWithPoToken: true,
    //     streamOptions: {
    //         useClient: "WEB"
    //     }
    // });

    // for testing only - prod use one in guildCreate event
    // const guild = client.guilds.cache.get(process.env.SERVER_ID);
    // await adminPermInit(guild);
});

client.on('guildCreate', async (guild) => {
    // const guild_members = await guild.members.fetch();
    //     newAdminPerm.owner = guild.ownerId;
    //     guild_members.forEach((gm) => {
    //         console.log(gm.roles.cache);
    await adminPermInit(guild);
    await Commands.init(guild.id);
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
            await interaction.deferReply({ timeout: 60000 });
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
            await Commands.command_funcs.admin(interaction, initted, granted_perms.get(interaction.guild.id));
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