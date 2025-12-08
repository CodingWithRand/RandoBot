import { ApplicationCommandOptionType } from "discord.js";

export function getOptionChoices(choices) {
    let choice_list = [];
    for(const choice of choices) choice_list.push(`\`${choice.name} - ${choice.value}\``);
    return choice_list.join(', ');
}

export function getCommandInputDataType(intId) {
    switch(intId){
        case ApplicationCommandOptionType.String: return "String";
        case ApplicationCommandOptionType.Integer: return "Integer";
        case ApplicationCommandOptionType.Boolean: return "Boolean";
        case ApplicationCommandOptionType.User: return "User";
        case ApplicationCommandOptionType.Channel: return "Channel";
        case ApplicationCommandOptionType.Role: return "Role";
        case ApplicationCommandOptionType.Mentionable: return "Mentionable";
        case ApplicationCommandOptionType.Attachment: return "Attachment";
        case ApplicationCommandOptionType.Subcommand: return "Sub_Command";
        case ApplicationCommandOptionType.SubcommandGroup: return "Sub_Command_Group";
        default: return "\`Unknown\`";
    }
}