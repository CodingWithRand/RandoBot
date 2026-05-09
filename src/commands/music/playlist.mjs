import { QueryType } from "discord-player";
import { MusicPlaylists } from "../../schema.mjs";
import { MessageFlags } from "discord.js";

export async function playFromPlaylist(interaction, player) {
    const userPlaylists = await MusicPlaylists.findOne({ uid: interaction.user.id });
    if(!userPlaylists) return await interaction.followUp({ content: "You don't have any saved playlists!", flags: MessageFlags.Ephemeral });
    const playlistToPlay = userPlaylists.playlists.get(interaction.options.getString("playlist"));
    if(!playlistToPlay) return await interaction.followUp({ content: "The playlist doesn't exist", flags: MessageFlags.Ephemeral });

    // Problem: Track plays in (possibly) random order, SOLVED.
    for(const url of playlistToPlay.tracks.values()) {
        await player.play(interaction.member.voice?.channel, url, {
            searchEngine: QueryType.AUTO, // Youtube for now, will do service recognition later.
            nodeOptions: {
                metadata: interaction,
                leaveOnEmptyCooldown: 30000
            },
        });
    }
    
    await interaction.followUp({ content: `Successfully enqueued **${interaction.options.getString("playlist")}**` });
}

export async function savePlaylist(interaction, queue) {
    if(!queue) return await interaction.followUp({ content: "No queue to save!", flags: MessageFlags.Ephemeral });

    const playlistName = interaction.options.getString("name");
    if(!playlistName) return await interaction.followUp({ content: "Please provide a name for the playlist!", flags: MessageFlags.Ephemeral });

    const newPlaylistTracks = new Map();

    newPlaylistTracks.set(queue.currentTrack.id, queue.currentTrack.url);
    queue.tracks.data.forEach(track => newPlaylistTracks.set(track.id, track.url));

    const userPlaylists = await MusicPlaylists.findOne({ uid: interaction.user.id })
    const newPlaylist = new Map();
    newPlaylist.set(playlistName, { tracks: newPlaylistTracks });
    if(!userPlaylists) {
        const newUserPlaylist = new MusicPlaylists({ 
            uid: interaction.user.id,
            playlists: newPlaylist
        })
        await newUserPlaylist.save();
    } else {
        await userPlaylists.updateOne({ $set: { [`playlists.${playlistName}`]: { tracks: newPlaylistTracks } } })
    }

    await interaction.followUp({ content: `Successfully saved the current queue as **${playlistName}** to your account!` });
}

export async function deletePlaylist(interaction) {
    const playlistNameToDelete = interaction.options.getString("name");
    if(!playlistNameToDelete) return await interaction.followUp({ content: "Please provide the name of the playlist to delete!", flags: MessageFlags.Ephemeral });
    const userPlaylists = await MusicPlaylists.findOne({ uid: interaction.user.id })
    if(!userPlaylists) return await interaction.followUp({ content: "You don't have any saved playlists!", flags: MessageFlags.Ephemeral });
    const playlistToDelete = userPlaylists.playlists.get(playlistNameToDelete);
    if(!playlistToDelete) return await interaction.followUp({ content: "Could not find the playlist in your account.", flags: MessageFlags.Ephemeral });
    await userPlaylists.updateOne({ $unset: { [`playlists.${playlistNameToDelete}`]: "" } })

    await interaction.followUp({ content: `Successfully deleted **${playlistNameToDelete}** from your account!` });
}