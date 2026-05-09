import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } from "discord.js";

export async function deployController(interaction, queue, history) {
    if(!queue || !queue.currentTrack) return await interaction.followUp({ content: "Please play some music first!", flags: MessageFlags.Ephemeral });
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
}

export async function playback(queue, interaction, mode) {
    // mode true = forward, false = backtrack
    
    if(!queue || !queue.currentTrack) return await interaction.followUp(`No playing track to ${mode ? "forward" : "backtrack"}!`);
    const seconds = interaction.options.getInteger("seconds") && interaction.options.getInteger("seconds") > 0 ? interaction.options.getInteger("seconds") : 10;
    await interaction.followUp(`${mode ? "Forwarding" : "Backtracking"} **${queue.currentTrack.title} - ${queue.currentTrack.author}** by ${seconds} seconds...`);
    queue.node.seek(queue.node.getTimestamp().current.value + (seconds * 1000 * (mode ? 1 : -1)));
}