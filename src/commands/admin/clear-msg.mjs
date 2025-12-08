import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default async function clearMessages(client, interaction, reqAmount) {
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

        interaction.followUp({ 
            content: "This may clear all messages in the channel, would you like to proceed?",
            components: [btnRow],
            ephemeral: true,
        })

        client.on('interactionCreate', async (btnInteraction) => {
            if(!btnInteraction.isButton()) return;
            if(btnInteraction.customId === 'confirm_clear') {
                btnInteraction.deferReply({ timeout: 60000, ephemeral: true });
                try {
                    while(interaction.channel.messages.cache.size > 1) {
                        const msgs = await interaction.channel.messages.fetch({ limit: 100 });
                        await interaction.channel.bulkDelete(msgs)
                    }
                    btnInteraction.followUp({ content: "Clearing process has been completed", ephemeral: true });
                } catch (err) {
                    console.error(err);
                    btnInteraction.followUp({ content: "Something went wrong, abort the clearing process", ephemeral: true });
                }
            } else if (btnInteraction.customId === 'cancel_clear') {
                btnInteraction.reply({ content: "Clearing process has been cancelled", ephemeral: true });
            }
        })
    } else {
        try {
            deleted_amount = 0;
            while(reqAmount > 0){
                const msgs = await interaction.channel.messages.fetch({ limit: Math.min(reqAmount, 100) });
                interaction.channel.bulkDelete(msgs)
                deleted_amount += msgs.size;
                reqAmount -= 100;
            }
        } catch (error) {
            ok = false
            console.error('Error clearing messages:', error);
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