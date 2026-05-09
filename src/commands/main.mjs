import Commands from "./init.mjs"
import { MessageFlags } from "discord.js";
import { GateActions, GateSetupActions } from "./admin/gate.mjs";

export async function buttonJobs(interaction) {
    if (interaction.customId.startsWith("gs_continue_")) await GateSetupActions.Button.continue(interaction);
    else if (interaction.customId.startsWith("gs_abort_")) await GateSetupActions.Button.abort(interaction);

    if (interaction.customId.startsWith("g_")) await GateActions.Button.enter(interaction)
}

export async function modalJobs(interaction) {
    if (interaction.customId.startsWith("gs_modal_")) GateSetupActions.Modal.submit(interaction);
    else if (interaction.customId.startsWith("g_modal_")) GateActions.Modal.submit(interaction);
}

export async function commandJobs(interaction) {
    function checkUnavailability(commandName) {
        const thisGuildCommands = Commands.commands_list.get(interaction.guild.id);
        if (!thisGuildCommands) {
            console.log("Commands have not been initialized (somehow), reinitializing...");
            Commands.init(interaction.guild.id);
            return false;
        }
        return Array.from(thisGuildCommands, ([,cmdData]) => (cmdData)).findIndex(cmd => cmd.name === commandName) === -1;
    }

    switch(interaction.commandName){
        case 'date': 
            await interaction.deferReply();
            if(checkUnavailability("date")){
                await interaction.followUp({ content: "The command is not available in this server as it may have been deleted." });
                break;
            }
            await interaction.followUp(Commands.command_funcs.getDate(interaction));
            break;
        case 'rm':
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            if(checkUnavailability("rm")){
                await interaction.followUp({ content: "The command is not available in this server as it may have been deleted." });
                break;
            }
            await interaction.followUp({ embeds: [await Commands.command_funcs.getRoleMembers(interaction.guild, "cmd-rm")], flags: MessageFlags.Ephemeral });
            break;
        case 'chatbot':
            if(checkUnavailability("chatbot")){
                await interaction.reply({ content: "The command is not available in this server as it may have been deleted." });
                break;
            }
            await Commands.command_funcs.chatbot(interaction);
            break;
        case 'image':
            await interaction.deferReply({ timeout: 60000 });
            if(checkUnavailability("image")){
                await interaction.followUp({ content: "The command is not available in this server as it may have been deleted." });
                break;
            }
            await Commands.command_funcs.image(interaction)
            break;
        case 'help':
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            await Commands.command_funcs.help(interaction);
            break;
        case 'admin':
            if(interaction.options.getSubcommand() !== "gate") await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            await Commands.command_funcs.admin(interaction);
            break;
    }  
}