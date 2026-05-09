import playFromQuery from "./onetrack.mjs";
import { QueryType } from "discord-player";
import { playFromPlaylist } from "./playlist.mjs";
// import { YoutubeExtractor } from "discord-player-youtubei";
import { YoutubeSabrExtractor } from "discord-player-googlevideo";
import { MusicPlaylists } from "../../schema.mjs";
import { MessageFlags } from "discord.js";

export default async function playNext(interaction, queue, query, player, now=false) {

    async function searchOne(q) {
        function isURL(q) {
            try {
                new URL(q);
                return true;
            } catch {
                return false;
            }
        }

        if(interaction.options.getString("service") === "sp" && isURL(query)){
            return await interaction.followUp("Playing first result from Spotify search may give incorrect results. Consider searching with the link and pick to play from the results.");
        } else if(interaction.options.getString("service") === "sp" && !isURL(query)) {
            return await interaction.followUp("Searching for music to play through keywords from Spotify is not possible. Consider searching with a link instead.")
        } else if(interaction.options.getString("service") !== "sp") { 
            const result = await player.search(q, {
                requestedBy: interaction.user,
                searchEngine:
                    // Non-URL query
                    // interaction.options.getString("service") === "yt" && !isURL(query) ? `ext:${YoutubeExtractor.identifier}` :
                    interaction.options.getString("service") === "yt" && !isURL(query) ? `ext:${YoutubeSabrExtractor.identifier}` :
                    interaction.options.getString("service") === "sc" && !isURL(query) ? QueryType.SOUNDCLOUD_SEARCH :
                    // URL query
                    // interaction.options.getString("service") === "yt" && isURL(query) ? `ext:${YoutubeExtractor.identifier}` :
                    interaction.options.getString("service") === "yt" && isURL(query) ? `ext:${YoutubeSabrExtractor.identifier}` :
                    interaction.options.getString("service") === "sc" && isURL(query) ? QueryType.SOUNDCLOUD_TRACK :
                    // Playlist Non-URL
                    // Playlist URL
                    // Fall back 
                    QueryType.AUTO
            })
            if (!result || !result.tracks.length) throw new Error(`No tracks found for query: ${q}!`);
            return result.tracks[0]
        }
    }

    if(!queue) {
        if(!query && !interaction.options.getString("playlist")) return await interaction.followUp({ content: "Please provide a search query or a playlist name to play!", flags: MessageFlags.Ephemeral });
        else if(!query && interaction.options.getString("playlist")) await playFromPlaylist(interaction, player);
        else if(query) await playFromQuery(interaction, query, player);
    } else {
        if(now) {
            await interaction.followUp("Putting the current playing track before the requested tracks...");
            queue.insertTrack(queue.currentTrack, 0);
        }

        if(query) {
            try {
                const track = await searchOne(query);
                queue.insertTrack(track, 0);
            } catch(e) {
                return await interaction.followUp(e.message);
            }
        } else if(interaction.options.getString("playlist")) {
            const userPlaylists = await MusicPlaylists.findOne({ uid: interaction.user.id });
            if(!userPlaylists) return await interaction.followUp({ content: "You don't have any saved playlists!", flags: MessageFlags.Ephemeral });
            const playlistToPlay = userPlaylists.playlists.get(interaction.options.getString("playlist"));
            if(!playlistToPlay) return await interaction.followUp({ content: "The playlist doesn't exist", flags: MessageFlags.Ephemeral });

            for(const [i, url] of Array.from(playlistToPlay.tracks.values()).entries()) {
                try {
                    const track = await searchOne(url);
                    queue.insertTrack(track, i);
                } catch(e) {
                    await interaction.followUp(e.message);
                    continue;
                }
            }
            await interaction.followUp(`Successfully enqueued **${interaction.options.getString("playlist")}**`);
        }

        if (now) queue.node.skip();
        else await interaction.followUp(`⏭️ Next up: **${queue?.tracks.data[0].title} - ${queue?.tracks.data[0].author}**${interaction.options.getString("playlist") ? ` from **${interaction.options.getString("playlist")}**` : ""}`);
    }
}
