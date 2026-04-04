import { QueryType, useHistory, useMainPlayer, useQueue } from "discord-player";
import { YoutubeSabrExtractor } from "discord-player-googlevideo";
import { SpotifyExtractor } from "discord-player-spotify";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from "discord.js";

export default async function music(interaction) {
    const player = useMainPlayer();
    const history = useHistory(interaction.guild);
    const queue = useQueue(interaction.guild);
    const query = interaction.options.getString("query");
    
    function isURL(q) {
        try {
            new URL(q);
            return true;
        } catch {
            return false;
        }
    }

    switch(interaction.options.getSubcommand()){
        case "search":
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
                if (!i.member.voice?.channel) return await i.followUp({ content: "Please join a voice channel first!", ephemeral: true });

                const index = Number(i.customId.split('_').pop());
                const track = top5tracks[index];
                
                const queue = player.nodes.create(i.guild, {
                    metadata: i
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
            break;
        case "skip":
            if(!queue) return await interaction.followUp("Nothing to skip!");
            else {
                await interaction.followUp("Skipping to the next track...");
                queue.node.skip();
            }
            break;
        case "stop":
            if(!queue) return await interaction.followUp("No queue to stop!");
            else {
                queue.delete();
                await interaction.followUp("Successfully stopped playback.");
            }
            break;
        case "pause":
            if(!queue) return await interaction.followUp("Nothing to pause!");
            else {
                queue.node.pause();
                await interaction.followUp("Paused playback.");
            }
            break;
        case "resume":
            if(!queue) return await interaction.followUp("Nothing to resume!");
            else {
                queue.node.pause();
                await interaction.followUp("Resumed playback.");
            }
            break;
        case "controller":
            if(!interaction.member.voice?.channel) return await interaction.followUp({ content: "Please join a voice channel first!", ephemeral: true });
            if(!queue) return await interaction.followUp({ content: "Please play some music first!", ephemeral: true });
            const ctrlBtns = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('track_back_most')
                    .setStyle(ButtonStyle.Secondary)
                    .setLabel('|◀◀'),
                new ButtonBuilder()
                    .setCustomId('track_back_one')
                    .setStyle(ButtonStyle.Primary)
                    .setLabel('◀◀'),
                new ButtonBuilder()
                    .setCustomId('track_action')
                    .setStyle(ButtonStyle.Danger)
                    .setLabel('▶'),
                new ButtonBuilder()
                    .setCustomId('track_forward_one')
                    .setStyle(ButtonStyle.Primary)
                    .setLabel('▶▶'),
                new ButtonBuilder()
                    .setCustomId('track_forward_most')
                    .setStyle(ButtonStyle.Secondary)
                    .setLabel('▶▶|')
            )
            let current_controller = await interaction.followUp({
                content: `Now playing: **${queue.currentTrack.title}** by **${queue.currentTrack.author ?? "Unknown"}**\n${queue.node.createProgressBar()}`,
                components: [ctrlBtns],
                fetchReply: true
            })

            async function fucrBtnInteractionCollectorEvent(fucrBtnInteraction) {
                await fucrBtnInteraction.deferReply();
                if (!fucrBtnInteraction.customId.startsWith('track_')) return;
                /* Behavior 
                 *⏮️Go back one track
                 *⏪Go back 10s
                 *⏸️Pause/Play
                 *⏩Go forward 10s
                 *⏭️Go to next track
                 * Note: It's so delay man :(
                 */
                // console.log(queue.node.getTimestamp().current., queue.node.getTrackPosition(), queue.node.get)
                if(fucrBtnInteraction.customId === 'track_back_most') {
                    try { await history.previous(); }
                    catch(err) { return await fucrBtnInteraction.followUp("No more previous track!") }
                } else if(fucrBtnInteraction.customId === 'track_back_one') {
                    queue.node.seek(queue.node.getTimestamp().current.value - 10000);
                } else if(fucrBtnInteraction.customId === 'track_action') {
                    if(queue.node.isPlaying()) {
                        ctrlBtns.components[2].setLabel('▶');
                        queue.node.pause();
                    }
                    else {
                        ctrlBtns.components[2].setLabel('||');
                        queue.node.resume();
                    }
                } else if(fucrBtnInteraction.customId === 'track_forward_one') {
                    queue.node.seek(queue.node.getTimestamp().current.value + 10000);
                } else if(fucrBtnInteraction.customId === 'track_forward_most') {
                    queue.node.skip();
                }
                
                await current_controller.delete();
                if(queue.currentTrack) current_controller = await fucrBtnInteraction.followUp({
                    content: `Now playing: **${queue.currentTrack.title}** by **${queue.currentTrack.author ?? "Unknown"}**\n${queue.node.createProgressBar()}`,
                    components: [ctrlBtns],
                    fetchReply: true 
                })
                else await fucrBtnInteraction.followUp("No more track to play!");

                const fucrBtnInteractionCollector = await (await fucrBtnInteraction.fetchReply()).createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    time: 15*60000
                })

                fucrBtnInteractionCollector.on("collect", fucrBtnInteractionCollectorEvent)
            }

            const fucrBtnInteractionCollector = await (await interaction.fetchReply()).createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 15*60000
            })

            fucrBtnInteractionCollector.on("collect", fucrBtnInteractionCollectorEvent)
            // TODO: the << < ||/|> > >> music controller
            break;
        case "play":
            if(!interaction.member.voice?.channel) return await interaction.followUp({ content: "Please join a voice channel first!", ephemeral: true });

            try {
                let searchResult;
                if(interaction.options.getString("service") === "sp" && isURL(query)){
                    return await interaction.followUp("Playing first result from Spotify search may give incorrect results. Consider searching with the link and pick to play from the results.");
                } else if(interaction.options.getString("service") === "sp" && !isURL(query)) {
                    return await interaction.followUp("Searching for music to play through keywords from Spotify is not possible. Consider searching with a link instead.")
                } else if(interaction.options.getString("service") !== "sp") {
                    const usingSearchEngine = 
                        // Non-URL query
                        interaction.options.getString("service") === "yt" && !isURL(query) ? `ext:${YoutubeSabrExtractor.identifier}` :
                        interaction.options.getString("service") === "sc" && !isURL(query) ? QueryType.SOUNDCLOUD_SEARCH :
                        // URL query
                        interaction.options.getString("service") === "yt" && isURL(query) ? `ext:${YoutubeSabrExtractor.identifier}` :
                        interaction.options.getString("service") === "sc" && isURL(query) ? QueryType.SOUNDCLOUD_TRACK :
                        // Playlist Non-URL
                        // Playlist URL
                        // Fall back 
                        QueryType.AUTO // <- Use YouTube's instead due to frequent unavailability of soundcloud's (Often the extractor for Query.AUTO)
                        
                    searchResult = await player.play(interaction.member.voice?.channel, query, {
                        searchEngine: usingSearchEngine,
                        nodeOptions: {
                            metadata: interaction
                        },
                    });

                    await interaction.followUp({ content: `**${searchResult.track.title}** enqueued!`, ephemeral: false });
                }
            } catch (e) {
                // let's return error if something failed
                await interaction.followUp(`Something went wrong: ${e}`);
            }
            break;
        }
}