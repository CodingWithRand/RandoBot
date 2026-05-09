import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { useHistory, useMainPlayer, useQueue } from "discord-player";
import searchTracks from "./search.mjs";
import { deployController, playback } from "./controller.mjs";
import { showQueue, showPlaylists } from "./show.mjs";
import playFromQuery from "./onetrack.mjs";
import { playFromPlaylist, savePlaylist, deletePlaylist } from "./playlist.mjs";
import playNext from "./moreplay.mjs";

export const command_names = {
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
        .setDescription("Show the current music queue."),
    leave: new SlashCommandBuilder()
        .setName("leave")
        .setDescription("Make the bot leave the voice channel."),
    skipto: new SlashCommandBuilder()
        .setName("skipto")
        .setDescription("Skip to a specific track in the queue.")
        .addIntegerOption(option =>
            option.setName("tracknumber")
                .setRequired(true)
                .setDescription("Track number to skip to.")
        ),
    swap: new SlashCommandBuilder()
        .setName("swap")
        .setDescription("Swap two tracks in the queue.")
        .addIntegerOption(option =>
            option.setName("tracknumber1")
                .setRequired(true)
                .setDescription("First track number to swap.")
        )
        .addIntegerOption(option =>
            option.setName("tracknumber2")
                .setRequired(true)
                .setDescription("Second track number to be swapped.")
        ),
    reorder: new SlashCommandBuilder()
        .setName("reorder")
        .setDescription("Reorder; moving a track from one position to another in the queue.")
        .addIntegerOption(option =>
            option.setName("from")
                .setRequired(true)
                .setDescription("Track number to start from.")
        )
        .addIntegerOption(option =>
            option.setName("to")
                .setRequired(true)
                .setDescription("Track number to end at.")
        ),
    lookup: new SlashCommandBuilder()
        .setName("lookup")
        .setDescription("Lookup track information with given track number.")
        .addIntegerOption(option =>
            option.setName("tracknumber")
                .setRequired(true)
                .setDescription("Track number to lookup.")
        ),
    forward: new SlashCommandBuilder()
        .setName("forward")
        .setDescription("Forward a track in the queue by specific seconds.")
        .addIntegerOption(option =>
            option.setName("seconds")
                .setDescription("Seconds to forward.")
        ),
    backtrack: new SlashCommandBuilder()
        .setName("backtrack")
        .setDescription("Backtrack a track in the queue by specific seconds.")
        .addIntegerOption(option =>
            option.setName("seconds")
                .setDescription("Seconds to backtrack.")
        ),
    playnext: new SlashCommandBuilder()
        .setName("playnext")
            .setDescription("/play command, but insert the musics on top of the queue.")
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
    playfirst: new SlashCommandBuilder()
        .setName("playfirst")
            .setDescription("/play command, but insert the musics on top of the queue and immediately play it.")
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
};

export async function music(interaction) {
    if(!interaction.member.voice?.channel) return await interaction.followUp({ content: "Please join a voice channel first!", flags: MessageFlags.Ephemeral });
    
    const player = useMainPlayer();
    const history = useHistory(interaction.guild);
    const queue = useQueue(interaction.guild);
    const query = interaction.options.getString("query");

    switch(interaction.commandName){
        case "search":
            await searchTracks(interaction, query, player);
            break;
        case "skip":
            if(!queue) return await interaction.followUp("No track to skip!");
            await interaction.followUp("Skipping to the next track...");
            queue.node.skip();
            break;
        case "stop":
            if(!queue) return await interaction.followUp("No queue to stop!");
            queue.delete();
            await interaction.followUp("Successfully stopped playback.");
            break;
        case "pause":
            if(!queue || !queue.currentTrack) return await interaction.followUp("No playing track to pause!");
            queue.node.pause();
            await interaction.followUp("Paused playback.");
            break;
        case "resume":
            if(!queue || !queue.currentTrack) return await interaction.followUp("No playing track to resume!");
            queue.node.resume();
            await interaction.followUp("Resumed playback.");
            break;
        case "controller":
            await deployController(interaction, queue, history);
            break;
        case "play":
            if(!query && !interaction.options.getString("playlist")) return await interaction.followUp({ content: "Please provide a search query or a playlist name to play!", flags: MessageFlags.Ephemeral });
            else if(!query && interaction.options.getString("playlist")) await playFromPlaylist(interaction, player);
            else if(query) await playFromQuery(interaction, query, player);
            break;
        case "queue":
            await showQueue(interaction, queue);
            break;
        case "save":
            await savePlaylist(interaction, queue);
            break;
        case "delpl":
            await deletePlaylist(interaction);
            break;
        case "list":
            await showPlaylists(interaction);
            break;
        case "leave":
            if(queue.connection) {
                queue.connection.destroy();
                await interaction.followUp("Left the voice channel.");
            } else await interaction.followUp("I'm not in a voice channel!");
            break;
            // TODO: Show saved playlist in the db
        case "skipto":
            if(!queue) return await interaction.followUp("No track to skip!");
            const trackNumber = interaction.options.getInteger("tracknumber");
            const track = queue.tracks.toArray()[trackNumber - 1];
            if(!track) return await interaction.followUp("Could not find a track with that number!");
            await interaction.followUp(`Skipping to **${track.title} - ${track.author}**...`);
            queue.node.skipTo(track);
            break;
        case "swap":
            if(!queue) return await interaction.followUp("No tracks to swap!");
            const [ trackNumber1, trackNumber2 ] = [ interaction.options.getInteger("tracknumber1"), interaction.options.getInteger("tracknumber2") ];
            const [ track1, track2 ] = [ queue.tracks.toArray()[trackNumber1 - 1], queue.tracks.toArray()[trackNumber2 - 1] ];
            if(!track1) return await interaction.followUp(`Could not find a track with that number! **#${trackNumber1}**`);
            if(!track2) return await interaction.followUp(`Could not find a track with that number! **#${trackNumber2}**`);
            await interaction.followUp(`Successfully swapped **${track1.title} - ${track1.author}** (#${trackNumber1}) and **${track2.title} - ${track2.author}** (#${trackNumber2}) in the queue!`);
            queue.node.swap(track1, track2)
            break;
        case "reorder":
            if(!queue) return await interaction.followUp("No tracks to move around!");
            const [ fromTrackNumber, toTrackNumber ] = [ interaction.options.getInteger("from"), interaction.options.getInteger("to") ];
            const fromTrack = queue.tracks.toArray()[fromTrackNumber - 1];
            if(!fromTrack) return await interaction.followUp(`Could not find a track with that number! **#${fromTrackNumber}**`);
            if(toTrackNumber <= 0 || toTrackNumber >= queue.tracks.size) return await interaction.followUp(`New track number exceeds the queue size or is less than 1! **#${toTrackNumber}**`);
            await interaction.followUp(`Successfully moved **${fromTrack.title} - ${fromTrack.author}** to position **#${toTrackNumber}** of the queue!`);
            queue.node.move(fromTrack, toTrackNumber - 1);
            break;
        case "lookup":
            if(!queue) return await interaction.followUp("No tracks to look up!");
            const lookUpTrackNumber = interaction.options.getInteger("tracknumber");
            if(lookUpTrackNumber === 0) return await interaction.followUp(`Current playing track is **${queue.currentTrack.title} - ${queue.currentTrack.author}** in the current queue!`);
            const lookUpTrack = queue.tracks.toArray()[lookUpTrackNumber - 1];
            if(!lookUpTrack) return await interaction.followUp(`Could not find a track with that number! **#${lookUpTrackNumber}**`);
            await interaction.followUp(`Track **#${lookUpTrackNumber}** is **${lookUpTrack.title} - ${lookUpTrack.author}** in the current queue!`);
            break;
        case "forward":
            await playback(queue, interaction, true);
            break;
        case "backtrack":
            await playback(queue, interaction, false);
            break;
        case "playnext":
            await playNext(interaction, queue, query, player);
            break;
        case "playfirst":
            await playNext(interaction, queue, query, player, true);
            break;
    }
}