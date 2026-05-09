// This and music.mjs is part of another bot, dedicated for music player bot -> ListenWDaisey.
// This bot will run locally, see note below.

/* 
   Why do this... I wished I'd had other options, but...
   I have tried every way. Researched everything. There is no way to avoid IP block from YouTube and SoundCloud, so I may have to use proxy server, with my own pc.
   TODO: implement consistent (url) proxy, and unlimited bandwidth (if possible) for free and add it here.
   Tried: cloudflared ❌, localtunnel ❌, ngrok ❌😔, serveo ❌ playit.gg (tcp) ❌

   Takeaway:
   - passing headers in ProxyAgent mean passing it to the destination server, not to the proxy server.
   - the solution with igops/ngrok-skip-browser-warning:latest repo only work with normal fetch method (CRUD). WHICH the proxy agent do CONNECT tunneling.
   - TCP MIGHT be the way. By opening raw tunnel connection between your local to the destination server with the proxy is just the tunnel.
   - no free proxy service provide unlimited bandwidth and consistent url -> run the music command locally would be a better option, until i decide to port my bot to raspberry pi.

   Conclusion: The music bot will be running locally on my machine, for now...
 */ 

const { Player } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');
// const { YoutubeExtractor } = require('discord-player-youtubei');
const { YoutubeSabrExtractor } = require('discord-player-googlevideo');
const { SpotifyExtractor } = require('discord-player-spotify');
const { GatewayIntentBits, Client, EmbedBuilder, ActivityType, MessageFlags } = require('discord.js');
const { CommandList } = require('./util.mjs');
const mongoose = require('mongoose');
const { music, command_names } = require('./commands/music/main.mjs');
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

// Music player initialization

const player = new Player(client)

player.events.on('playerStart', (queue, track) => {
    queue.metadata.channel.send(`Started playing **${track.cleanTitle}**!`);
})

player.events.on("queueDelete", (queue) => {
    queue.metadata.channel.send("Queue finished");
})

player.events.on('error', (queue, error) => {
    console.log(error.message);
})

player.events.on('playerError', (queue, error, track) => {
    queue.metadata.channel.send(`Error playing **${track.cleanTitle}**: ${error.message}, skipping.`);
    queue.node.skip();
})

client.once('clientReady', async () => {
    await player.extractors.loadMulti(DefaultExtractors);
    await player.extractors.register(SpotifyExtractor);

    // discord-player-youtubei@beta's extractor, if discord-player-googlevideo's one doesn't work try switching to this.
    // await player.extractors.register(YoutubeExtractor, {
    //     cookie: process.env.YT_COOKIES,
    //     generateWithPoToken: true,
    //     streamOptions: {
    //         useClient: "WEB"
    //     }
    // });

    // current working youtube extractor "discord-player-googlevideo"
    await player.extractors.register(YoutubeSabrExtractor);

    const disco_api_url = `https://discord.com/api/v10/applications/${process.env.LISTENWDAISEY_BOT_ID}/commands`;
    const adding_commands = await fetch(disco_api_url, {
        method: 'PUT',
        headers: {
            'Authorization': `Bot ${process.env.LISTENWDAISEY_BOT_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(Object.values(command_names).map(command => command.toJSON()))
    })

    const data = await adding_commands.json();

    if (!adding_commands.ok) {
        console.error('Error adding application (/) commands:', data);
    }

    console.log(`Logged in as ${client.user.tag}`);
    
    await mongoose.connect(process.env.MONGODB_URI);

    client.user.setPresence({
        activities: [{
            name: "Music 🎵🎶🎧 & Podcast 🎙️📻",
            type: ActivityType.Streaming,
            url: "https://www.youtube.com"
        }],
        status: "online"
    })
})

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;
    switch (interaction.commandName) {
        case 'help':
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const cmdListForUser = new EmbedBuilder()
                .setColor("#ffffff")
                .setTitle("Commands Help Center")
                .setDescription("You can see the list of commands and how to use it here");
        
            const disco_api_url = `https://discord.com/api/v10/applications/${process.env.LISTENWDAISEY_BOT_ID}/commands`;
            const options = {
                method: 'GET',
                headers: {
                    'Authorization': `Bot ${process.env.LISTENWDAISEY_BOT_TOKEN}`,
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
                flags: MessageFlags.Ephemeral,
                fetchReply: true
            });
        
            await CommandEmbedListForUser.registerControlBtn("user", interaction);
            break;
        default:
            await interaction.deferReply({ timeout: 60000 });
            await music(interaction)
            break;
    }
})

client.login(process.env.LISTENWDAISEY_BOT_TOKEN);