import { QueryType } from "discord-player";
import { YoutubeSabrExtractor } from "discord-player-googlevideo";
// import { YoutubeExtractor } from "discord-player-youtubei";

export default async function playFromQuery(interaction, query, player) {
    function isURL(q) {
        try {
            new URL(q);
            return true;
        } catch {
            return false;
        }
    }

    try {
        let searchResult;
        if(interaction.options.getString("service") === "sp" && isURL(query)){
            return await interaction.followUp("Playing first result from Spotify search may give incorrect results. Consider searching with the link and pick to play from the results.");
        } else if(interaction.options.getString("service") === "sp" && !isURL(query)) {
            return await interaction.followUp("Searching for music to play through keywords from Spotify is not possible. Consider searching with a link instead.")
        } else if(interaction.options.getString("service") !== "sp") { 
            const usingSearchEngine = 
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
                QueryType.AUTO // <- Use YouTube's instead due to frequent unavailability of soundcloud's (Often the extractor for Query.AUTO)       
            searchResult = await player.play(interaction.member.voice?.channel, query, {
                searchEngine: usingSearchEngine,
                nodeOptions: {
                    metadata: interaction,
                    leaveOnEmptyCooldown: 30000
                },
            });

            await interaction.followUp({ content: `**${searchResult.track.title}** enqueued!` });
        }
    } catch (e) {
        // let's return error if something failed
        await interaction.followUp(`Something went wrong: ${e}`);
    }
}