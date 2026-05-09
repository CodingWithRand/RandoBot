import { EmbedBuilder, MessageFlags } from "discord.js";
import { MusicPlaylists } from "../../schema.mjs";

export async function showQueue(interaction, queue) {
    if(!queue) return await interaction.followUp("The queue is currently empty!");
    const queueEmbed = new EmbedBuilder()
        .setTitle("Current Music Queue")
        .setFields(
            { name: "Now Playing", value: `**${queue.currentTrack.title}** by **${queue.currentTrack.author ?? "Unknown"}**` },
            { name: "Up Next", value: queue.tracks.data.length > 0 ? queue.tracks.data.slice(0, 5).map((t, i) => `**${i + 1}.** ${t.title} by ${t.author ?? "Unknown"}`).join('\n') : "No more tracks in the queue!" }
        )
        .setColor(0xFF0000);
    await interaction.followUp({ embeds: [queueEmbed] });
}

export async function showPlaylists(interaction) {
    const userPLlist = new EmbedBuilder()
        .setTitle(`${interaction.user.username}'s playlists`)
        .setColor(0xFF0000);

    const userPlaylists = await MusicPlaylists.findOne({ uid: interaction.user.id })
    if(!userPlaylists || userPlaylists.playlists.size === 0) userPLlist.setDescription("No playlists found.")
    else userPLlist.setDescription(Array.from(userPlaylists.playlists.keys()).map((name, i) => `**${i + 1}.** ${name}`).join('\n'));

    await interaction.followUp({ embeds: [userPLlist] });
}