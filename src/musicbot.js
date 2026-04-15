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
const { YoutubeSabrExtractor } = require('discord-player-googlevideo');
const { SpotifyExtractor } = require('discord-player-spotify');
const { GatewayIntentBits, Client, SlashCommandBuilder, EmbedBuilder, ActivityType } = require('discord.js');
const { CommandList } = require('./util.mjs');
const mongoose = require('mongoose');
const { default: music } = require('./commands/music.mjs');
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

player.events.on('playerError', (queue, error, track) => {
    queue.metadata.channel.send(`Error playing **${track.cleanTitle}**: ${error.message}, skipping.`);
    queue.node.skip();
})

client.once('ready', async () => {
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

    const command_names = {
        help: new SlashCommandBuilder()
            .setName("help")
            .setDescription("Show all available commands and their usage details."),
        query: new SlashCommandBuilder()
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
                ),
        play: new SlashCommandBuilder()
            .setName("play")
                .setDescription("Play music from the top result of the search.")
                .addStringOption(option => 
                    option.setName("query")
                        .setDescription("URL or keyword to search for music and play.")
                )
                .addStringOption(option => 
                    option.setName("playlist")
                        .setDescription("Playlist name to play.")
                )
                .addStringOption(option => 
                    option.setName("service")
                        .setDescription("Streaming service to play music from. (Optional)")
                        .addChoices(
                            { name: "YouTube", value: "yt" },
                            { name: "Spotify", value: "sp" },
                            { name: "SoundCloud", value: "sc" },
                        )
                ),
        skip: new SlashCommandBuilder()
            .setName("skip")
            .setDescription("Skip the current music."),
        stop: new SlashCommandBuilder()
            .setName("stop")
            .setDescription("Delete the entire music queue and stop the music."),
        pause: new SlashCommandBuilder()
            .setName("pause")
            .setDescription("Pause the current music."),
        resume: new SlashCommandBuilder()
            .setName("resume")
            .setDescription("Resume the paused music."),
        controller: new SlashCommandBuilder()
            .setName("controller")
            .setDescription("Music player controller"),
        save: new SlashCommandBuilder()
            .setName("save")
            .setDescription("Save the current music queue as a playlist.")
            .addStringOption(option => 
                option.setName("name")
                    .setRequired(true)
                    .setDescription("Name of the playlist to save.")
            ),
        delpl: new SlashCommandBuilder()
            .setName("delpl")
            .setDescription("Delete a saved playlist.")
            .addStringOption(option => 
                option.setName("name")
                    .setRequired(true)
                    .setDescription("Name of the playlist to delete.")
            ),
        list: new SlashCommandBuilder()
            .setName("list")
            .setDescription("Show the list of your saved playlists."),
        queue: new SlashCommandBuilder()
            .setName("queue")
            .setDescription("Show the current music queue.")
    };

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
            await interaction.deferReply({ ephemeral: true });
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
                ephemeral: true,
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