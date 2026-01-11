import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from "discord.js";
import Commands from "../../commands/init.mjs"
import { getCommandInputDataType, getOptionChoices } from "../../util.mjs";

// Modular imports of admin commands' functions
import getCommands from "./get-cmds.mjs";
import delCommand from "./del-cmds.mjs";
import clearMessages from "./clear-msg.mjs";
import grant_admin from "./grant.mjs";
import revoke_admin from "./revoke.mjs";

// Boilerplate function
async function execute(interaction, { permission, command }){
    if (permission) {
        try {
            const { success, error } = command.method;
            if(command.status.ok && command.acceptSuccessData){
                success(interaction, command.passingData);
            }else if(command.status.ok && !command.acceptSuccessData){
                success(interaction);
            }else if(!command.status.ok && command.acceptErrorData){
                error(interaction, command.passingData);
            }else if(!command.status.ok && !command.acceptErrorData){
                error(interaction);
            }
        } catch (error) {
            await interaction.followUp({ content: `Something went wrong, couldn't satisfy your action at the moment\`\`\`${error}\`\`\``, ephemeral: true });
        }
    } else {
        await interaction.followUp({ content: "You don't have permission to initialize admin commands.", ephemeral: true });
    }
}

// Initialization
async function init(interaction, initiation){
    initiation.set(interaction.user.id, true)
    const success = async (interaction, data=undefined) => {
        const adminCommandsEmbed = new EmbedBuilder()
            .setTitle("Administrator Commands")
            .setDescription("The following are the list of administrator commands you can use")
            .setColor("#00ff88")
            
        Object.entries(data).forEach(([cmdName, cmdDetail]) => {
            adminCommandsEmbed.addFields({ name: cmdName, value: `${cmdDetail.description}
                    ${cmdDetail.parameters !== "No parameters" ? `**Parameters**\n${(() => {
                        let paramList = [];
                        let counter = 1;
                        for(const [paramName, paramDetail] of Object.entries(cmdDetail.parameters)){
                            paramList.push(`\`${paramName}\` ${paramDetail.description} Take input as \`${paramDetail.type}\`. (${paramDetail.required ? "Required" : "Optional"})\n`);
                            counter++;
                        }
                        return paramList.join("");
                    })()}` : "\`No parameters\`"}
            ` })
        });
        await interaction.guild.members.fetch()
        const userRoles = await interaction.guild.members.cache.get(interaction.user.id).roles.cache.map(role => role.name);
        await interaction.followUp({ content: `Hello, ${interaction.user.username} (Role: ${userRoles.join(", ")}). It seems like you've just initialized the administrator console.\nHere are the available admin commands you can use`, embeds: [adminCommandsEmbed], ephemeral: true });
    };
    const error = async (interaction, data=undefined) => {
        await interaction.followUp({ content: `Couldn't initialize the console at the moment\`\`\`${JSON.stringify(data)}\`\`\``, ephemeral: true});
    };

    return { success, error }
}

// Sub-command handlers

// view-commands
async function vc(defaultPermission, interaction) {
    let cmd_list, ok;
    const implemention = await adminCommands.viewCommands.body(interaction, (res, err) => {
        // TODO: ~~Rewrite code to display options for each subcommand.~~ No need
        if(err){ console.error(err.message); return; };
        cmd_list = {}

        function constructCmdList(cmd) {
            cmd_list[cmd.id] = {
                name: cmd.name,
                description: cmd.description,
                options: (() => {
                    let cmd_options = [];
                    if(cmd.options){
                        cmd.options.forEach((option) => {
                            cmd_options.push(`\`${option.name}\` - ${option.description}
                                > **Parameter Value:** ${option.choices ? getOptionChoices(option.choices) : `\`${getCommandInputDataType(option.type)}\``}
                                > **Required:** \`${option.required ? "Yes" : "No"}\`
                            `)
                        })
                    }
                    return cmd_options
                })(),
            }
        }

        res.command_list.forEach(constructCmdList);
        ok = res.status;
        execute(interaction, { permission: defaultPermission, command: {
            method: implemention,
            passingData: cmd_list,
            status: { ok: ok },
            acceptSuccessData: true,
            acceptErrorData: true
        }})
    })
}

// del-command
async function dc(defaultPermission, interaction) {
    let removingCommandIds = [];
    if(!interaction.options.getString("commands")){
        await interaction.followUp({ content: "You need to provide command name or id to delete", ephemeral: true });
        return;
    }
    const removingCommands = interaction.options.getString("commands");
    for(const cmd of removingCommands.split(" ")) {
        if (cmd === "admin" || cmd === "help") continue;
        if (!isNaN(parseInt(cmd))) removingCommandIds.push(cmd);
        else{
            for(const [cmdId, cmdData] of Commands.commands_list.get(interaction.guild.id).entries()){
                if(cmd === cmdData.name && (cmdData.name !== "admin" || cmdData.name !== "help")) removingCommandIds.push(cmdId) 
            }
        }
    };
    if(removingCommandIds.length === 0){
        await interaction.followUp({ content: "No valid command name or id to delete", ephemeral: true });
        return;
    }
    const delConfirmation = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`confirm_del_cmd`)
                .setLabel('Yes')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('cancel_del_cmd')
                .setLabel('No')
                .setStyle(ButtonStyle.Secondary),
        )
    await interaction.followUp({ content: `You are about to delete commands with the following id from this server permanently\`\`\`${(
        () => {
            let showingCmdNameWithId = [];
            removingCommandIds.forEach((cmdId) => showingCmdNameWithId.push(`${cmdId} - ${Commands.commands_list.get(interaction.guild.id).get(cmdId).name}`));
            return showingCmdNameWithId.join('\n');
        }
    )()}\`\`\`would you like to proceed?`, components: [delConfirmation], ephemeral: true, fetchReply: true })

    const btnInteraction = await (await interaction.fetchReply()).awaitMessageComponent({ 
        componentType: ComponentType.Button, 
        time: 60000
    });
    if(btnInteraction.customId === 'confirm_del_cmd') {
        await btnInteraction.deferReply({ ephemeral: true });
        try {
            const { success, error, fetchingStatus, fetchResult } = await adminCommands.delCommand.body(interaction, removingCommandIds)
            await execute(btnInteraction, { permission: defaultPermission, command: {
                method: { success, error },
                passingData: fetchResult,
                status: { ok: fetchingStatus },
                acceptSuccessData: true,
                acceptErrorData: true
            }})
        }catch (err) {
            console.error(err)
            await execute(btnInteraction, { permission: defaultPermission, command: {
                method: {
                    success: async function (interaction) { await interaction.followUp({ content: "Incorrect command syntax", ephemeral: true })},
                    error: async function (interaction) { await interaction.followUp({ content: "Something went wrong. Currently unable to delete the command", ephemeral: true }) } 
                },
                status: { ok: true },
                acceptSuccessData: false,
                acceptErrorData: false
            }})
        }    
    } else if(btnInteraction.customId === 'cancel_del_cmd') {
        await btnInteraction.reply({ content: "Deleting process has been cancelled", flags: MessageFlags.Ephemeral });
    }
}

// cls
async function cls(defaultPermission, interaction) {
    const reqAmount = interaction.options.getInteger("number");
    const { success, error, ok, deleted_amount, all } = await adminCommands.clearMessage.body(interaction, reqAmount);
    await execute(interaction, { permission: defaultPermission, command: {
        method: { success, error },
        status: { ok: ok },
        acceptSuccessData: true,
        acceptErrorData: false,
        passingData: { deleted_amount, all }
    }})
}

// grant & revoke
async function grant_or_revoke(defaultPermission, interaction, granted_perm, m) {
    let addminRoles = interaction.options.getString("roles");
    let addminUsers = interaction.options.getString("users");
    if(!addminRoles && !addminUsers) return await interaction.followUp({ content: "You need to provide at least one role or user to add to admin list", ephemeral: true });
    if(addminRoles) addminRoles = addminRoles.split(" ");
    if(addminUsers) addminUsers = addminUsers.split(" ");
    let statenfunc;
    if(m==="g") statenfunc = await adminCommands.grant.body(interaction, addminRoles, addminUsers, granted_perm);
    else if(m==="r") statenfunc = await adminCommands.revoke.body(interaction, addminRoles, addminUsers, granted_perm);
    const { success, error, ok } = statenfunc;
    await execute(interaction, { permission: defaultPermission, command: {
        method: { success, error },
        status: { ok: ok },
        acceptSuccessData: false,
        acceptErrorData: false
    }})
}

// Main admin command handler
async function admin(interaction, initted, granted_perm) {
    const defaultPermission = (
        granted_perm.owner === interaction.user.id || 
        granted_perm.admin.includes(interaction.user.id) ||
        granted_perm.permitted.roles.includes(interaction.member.roles.cache.find((r) => r.name)) ||
        granted_perm.permitted.users.includes(interaction.user.id)
    )

    if(interaction.options.getSubcommand() === "init") {
        await execute(interaction, { permission: defaultPermission,
            command: {
                method: await adminCommands.init.body(interaction, initted),
                passingData: (() => {
                    let adminCmdList = {};
                    for(const k in adminCommands) if(typeof adminCommands[k] === "object") adminCmdList[adminCommands[k].name] = { 
                        description: adminCommands[k].description,
                        parameters: adminCommands[k].parameters ? adminCommands[k].parameters : "No parameters"
                    };
                    return adminCmdList
                })(),
                status: { ok: true },
                acceptSuccessData: true,
                acceptErrorData: true
        }})
        return;
    }

    if(!initted.get(interaction.user.id)) {
        await interaction.followUp({ content: "You need to initialize the admin commands first using `/admin init` command", ephemeral: true });
        return;
    }
    if(!defaultPermission) {
        await interaction.followUp({ content: "You don't have permission to use admin commands!", ephemeral: true });
        return;
    }
    // Switch other $ sign command to slash command
    switch(interaction.options.getSubcommand()){
        case "view-commands":
            await vc(defaultPermission, interaction);
            break;
        case "del-commands":
            await dc(defaultPermission, interaction);
            break;
        case "cls":
            await cls(defaultPermission, interaction);
            break;
        case "grant":
            await grant_or_revoke(defaultPermission, interaction, granted_perm, "g");
            break;
        case "revoke":
            await grant_or_revoke(defaultPermission, interaction, granted_perm, "r");
            break;
        case "whois":
            await interaction.followUp({ embeds: [await Commands.command_funcs.getRoleMembers(interaction.guild, "cmd-admin-whois", granted_perm)], ephemeral: true });
            break;
        default:
            await interaction.followUp({ content: "Invalid admin command.", ephemeral: true });
    }
}

const adminCommands = {
    init: {
        name: "init",
        description: "Use for initialize the administrator console to be able to use other admin level commands which are only available for certain group of users.",
        body: init
    },
    viewCommands: {
        name: "view-commands",
        description: "Retrieve all of the available slash command name and id.",
        body: getCommands
    },
    delCommand: {
        name: "del-commands",
        description: "Deleting command from the list",
        body: delCommand,
        parameters: {
            commands: {
                type: "Texts",
                description: "Command name(s) or id(s) to delete, separated by space.",
                required: true
            }
        }
    },
    clearMessage: {
        name: "cls",
        description: "Clear number of messages or all from the current channel.",
        body: clearMessages,
        parameters: {
            "number-of-messages": {
                type: "Number",
                description: "A number of messages to clear. Omitted if you want to clear all messages.",
                required: false
            }
        }
    },
    grant: {
        name: "grant",
        description: "Add a specific user or role to the admin list.",
        body: grant_admin,
        parameters: {
            "role": {
                type: "Texts",
                description: "Role(s) to add to the admin list, separated by space.",
                required: false
            },
            "user": {
                type: "Texts",
                description: "Username(s) to add to the admin list, separated by space.",
                required: false
            }
        }
    },
    revoke: {
        name: "revoke",
        description: "Remove a specific user or role from the admin list.",
        body: revoke_admin,
        parameters: {
            "role": {
                type: "Texts",
                description: "Role(s) to remove from the admin list, separated by space.",
                required: false
            },
            "user": {
                type: "Texts",
                description: "Username(s) to remove from the admin list, separated by space.",
                required: false
            }
        }
    },
    whois: {
        name: "whois",
        description: "Show the list of users and roles that have been granted admin permission.",
    }
};

export { adminCommands, admin };