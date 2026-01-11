import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Collection, ComponentType } from 'discord.js';

export default async function clearMessages(interaction, reqAmount) {
    let ok = true;
    let all;
    let deleted_amount;
    if(!reqAmount){
        all = true;
        const btnRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_clear')
                    .setLabel('Yes')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('cancel_clear')
                    .setLabel('No')
                    .setStyle(ButtonStyle.Secondary),
            )

        await interaction.followUp({ 
            content: "This may clear all messages in the channel, would you like to proceed?",
            components: [btnRow],
            ephemeral: true,
            fetchReply: true
        })

        try {
            const btnInteraction = await (await interaction.fetchReply()).awaitMessageComponent({ 
                componentType: ComponentType.Button, 
                time: 60000 
            });
            if(btnInteraction.customId === 'confirm_clear') {
                await btnInteraction.deferReply({ timeout: 60000, ephemeral: true });
                try {
                    console.log(interaction.channel.messages.cache.size);
                    while(true) {
                        const msgs = await interaction.channel.messages.fetch({ limit: 100 });
                        const deletable = msgs.filter(msg =>
                            Date.now() - msg.createdTimestamp < 14 * 24 * 60 * 60 * 1000
                        );
                        if(deletable.size === 0) break;
                        await interaction.channel.bulkDelete(deletable);
                    }
                    await btnInteraction.followUp({ content: "Clearing process has been completed", ephemeral: true });
                } catch (err) {
                    console.error(err);
                    if(err.code === 50034) await btnInteraction.followUp({ content: "Messages are too old to be cleared", ephemeral: true})
                    else {
                        ok = false;
                        await btnInteraction.followUp({ content: "Something went wrong, abort the clearing process", ephemeral: true });
                    }
                }
            } else if (btnInteraction.customId === 'cancel_clear') {
                await btnInteraction.reply({ content: "Clearing process has been cancelled", ephemeral: true });
            }
        } catch (error) {
            // Timeout or other error
            console.error(error)
            ok = false;
        }
    } else {
        try {
            deleted_amount = 0;
            while(reqAmount > 0){
                const msgs = await interaction.channel.messages.fetch({ limit: Math.min(reqAmount, 100) });
                const deletable = msgs.filter(msg =>
                    Date.now() - msg.createdTimestamp < 14 * 24 * 60 * 60 * 1000
                );
                await interaction.channel.bulkDelete(deletable);
                deleted_amount += deletable.size;
                reqAmount -= 100;
            }
        } catch (error) {
            if(error.code === 50034) await interaction.followUp({ content: "Messages are too old to be cleared", ephemeral: true})
            else{
                ok = false;
                console.error('Error clearing messages:', error);
            }
        }
    }

    const success = async (interaction, { deleted_amount, all }) => {
        console.log(deleted_amount)
        if(all) return;
        interaction.followUp({ content: `Cleared ${deleted_amount} messages.`, ephemeral: true });
    };
    const error = async (interaction) => {
        interaction.followUp({ content: "Something went wrong, unable to clear messages", ephemeral: true });
    };

    return { success, error, ok, deleted_amount, all }
}