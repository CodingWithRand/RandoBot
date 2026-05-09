import { QueryType } from "discord-player";
import { YoutubeSabrExtractor } from "discord-player-googlevideo";
// import { YoutubeExtractor } from "discord-player-youtubei";
import { SpotifyExtractor } from "discord-player-spotify";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } from "discord.js";

export default async function searchTracks(interaction, query, player) {
    let searchResult;
    if(interaction.options.getString("service") === "sp" && !isURL(query)) return await interaction.followUp("Searching with keywords from Spotify is not possible. Consider searching with a link instead.")
    else if(interaction.options.getString("service") === "sp" && isURL(query)) {
        searchResult = await player.search(interaction.options.getString("query"), {
            requestedBy: interaction.user,
            searchEngine: `ext:${SpotifyExtractor.identifier}`
        })
        searchResult = await player.search(`${searchResult.tracks[0].author} - ${searchResult.tracks[0].title}`, {
            requestedBy: interaction.user,
            searchEngine: QueryType.AUTO_SEARCH
        })
        await interaction.channel.send("*Due to limitations of discord player API, Spotify search results with link may vary and not be accurate.")
    } else if(interaction.options.getString("service") !== "sp") {
        searchResult = await player.search(query, {
            requestedBy: interaction.user,
            searchEngine:
                // interaction.options.getString("service") === "yt" ? `ext:${YoutubeExtractor.identifier}` :
                interaction.options.getString("service") === "yt" ? `ext:${YoutubeSabrExtractor.identifier}` :
                // interaction.options.getString("service") === "sp" ? `ext:${SpotifyExtractor.identifier}` : You don't need it.
                interaction.options.getString("service") === "sc" ? QueryType.SOUNDCLOUD_SEARCH :
                    QueryType.AUTO_SEARCH
        })
    }
    // 5 for now.
    const top5tracks = searchResult.tracks.slice(0, 5);
    if(top5tracks.length === 0) return await interaction.followUp({ content: `No results for **${query}** from **${searchResult.queryType}**` });
    const description = top5tracks.map((t, i) =>
        `**${i + 1}.** ${t.title}\n${t.author} • ${t.duration}`
    ).join('\n\n');
    const playBtns = new ActionRowBuilder().addComponents(
        top5tracks.map((_, i) =>
            new ButtonBuilder()
        .setCustomId(`play_track_${i}`)
            .setLabel(`Play #${i + 1}`)
            .setStyle(ButtonStyle.Primary)
        )
    );
    
    await interaction.followUp({
        content: `Top 5 results for **${interaction.options.getString("query")}**\n\n${description}`,
        components: [playBtns],
        fetchReply: true,
    });

    const searchResultPlayerCollector = await (await interaction.fetchReply()).createMessageComponentCollector({ 
        componentType: ComponentType.Button,
        time: 15*60000 
    });

    searchResultPlayerCollector.on('collect', async (i) => {
        await i.deferReply();
        if (!i.customId.startsWith('play_track_')) return;
        if (!i.member.voice?.channel) return await i.followUp({ content: "Please join a voice channel first!", flags: MessageFlags.Ephemeral });

        const index = Number(i.customId.split('_').pop());
        const track = top5tracks[index];
        
        const queue = player.nodes.create(i.guild, {
            metadata: i,
            leaveOnEmptyCooldown: 30000
        });

        if (!queue.connection)
            await queue.connect(i.member.voice.channel);
        
        queue.addTrack(track);
        if(!queue.isPlaying()) await queue.node.play();
        await i.followUp({
            content: `**${track.title} added to queue**`,
            components: [],
        });
    });
}