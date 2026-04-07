import { ApplicationCommandOptionType, ComponentType, ActionRowBuilder, ButtonStyle, ButtonBuilder } from "discord.js";

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

export class CommandList {
    static totalFields = [];
    // TODO: Continue Modularize for admin

    constructor({ f0r, embed }) {
        this.pageCharNum = 0;
        this.pages = [];
        this.currentPage = 1;
        this.lastPage = null;
        this.nextCmdId = null;
        this.cmdIdsLeft = null;
        this.constructFinished = false;
        this.thisPageFieldsMetadata = [];

        this.controlBtns = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('get_cmds_prev_page')
                    .setLabel('◀')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('get_cmds_next_page')
                    .setLabel('▶')
                    .setStyle(ButtonStyle.Primary),
            )
        this.embed = embed;
        if(f0r === "user") this.totalFields = CommandList.totalFields
        CommandList.totalFields = [];
    }

    construct(args, { next=true, cmdid_arg=undefined, cmdd_arg=undefined } = {}) {
        if(!args.field && (args.cmdId && args.cmdDetail)) {
            this.cmdId = args.cmdId;
            this.cmdDetail = args.cmdDetail;

            let cmdd = cmdd_arg || `
            ${this.cmdDetail.description}${this.cmdDetail.options.length > 0 ? "\n**Options**" : ""}
            ${this.cmdDetail.options.join("")}
            `
            let cmdid = cmdid_arg || `/${this.cmdDetail.name} (${this.cmdId})`

            this.pageCharNum += cmdid.length
            this.pageCharNum += cmdd.length
            
            if(this.pageCharNum <= 1024){
                if(!this.constructFinished && next) this.thisPageFieldsMetadata.push({ cmdId: this.cmdId, cmdDetail: this.cmdDetail })
                this.embed.addFields({ name: cmdid, value: cmdd })
                return true
            } else if(this.pageCharNum > 1024 && this.thisPageFieldsMetadata.length === 0) {
                // Single command exceed limit
                const totalPagesForThisCmd = Math.ceil(this.pageCharNum / 1024);
                for(let p = 0; p < totalPagesForThisCmd; p++) {
                    this.pageCharNum = 0;
                    cmdid = `/${this.cmdDetail.name} (${this.cmdId}) - ${p + 1}`
                    this.construct({ cmdId: this.cmdId, cmdDetail: this.cmdDetail }, {
                        next, 
                        cmdid_arg: cmdid,
                        cmdd_arg: `${cmdd.slice(p * (1024 - cmdid.length), ((p + 1) * (1024 - cmdid.length)))}`
                    })
                }
                // Warning: if pageCharNum eventually over 6000, it may cause error.
                return true
            } else {
                if(!this.constructFinished && next) this.nextCmdId = this.cmdId
                return false
            }
        } else if(args.field && (!args.cmdId && !args.cmdDetail)) {
            const field = args.field

            this.pageCharNum += JSON.stringify(field).length
            
            if(this.pageCharNum <= 1024){
                if(!this.constructFinished && next) this.thisPageFieldsMetadata.push(field)
                this.embed.addFields(field)
                return true
            } else if(this.pageCharNum > 1024 && this.thisPageFieldsMetadata.length === 0) {
                // Single command exceed limit
                const totalPagesForThisCmd = Math.ceil(this.pageCharNum / 1024);
                for(let p = 0; p < totalPagesForThisCmd; p++) {
                    this.pageCharNum = 0;
                    field.name = `/${field.name} - ${p + 1}`
                    field.value = `${field.value.slice(p * (1024 - field.name.length), ((p + 1) * (1024 - field.name.length)))}`
                    this.construct({ field }, { next })
                }
                return true
            } else {
                if(!this.constructFinished && next) this.nextCmdId = field.name
                return false
            }
        }
    }

    // For user case
    static addCommandDataField(cmd, header) {
        let optionText = ""
        if (cmd.options) cmd.options.forEach((opt) => {
            if (getCommandInputDataType(opt.type) === "Sub_Command") CommandList.addCommandDataField(opt, `${header} ${opt.name}`);
            if (opt.choices){
                let choice = opt.choices.map((c) => c.name);
                optionText += `\`${opt.name}: ${choice.join('|')}\` `
            }
            else optionText += `\`${opt.name}: ${getCommandInputDataType(opt.type)}\` `
        });
        if (Array.isArray(cmd.options) && (cmd.options.find((opt) => getCommandInputDataType(opt.type) === "Sub_Command"))) return;
        CommandList.totalFields.push({ name: `${header} ${optionText}`, value: (() => {
            if (cmd.options){
                return `${cmd.description}
                **Options**
                ${
                    cmd.options.map((opt) => {
                        if (opt.choices || opt.options){
                            let choice = opt.choices ? opt.choices.map((c) => `\`${c.name}\``) : opt.options.map((o) => `\`${o.name}\``);
                            return `\`${opt.name}\`: ${opt.description} Take input from the choices as ${choice.join('/')} ${opt.required ? "(Required)" : ""}`
                        }
                        else return `\`${opt.name}\`: ${opt.description} Take input as \`${getCommandInputDataType(opt.type)}\` ${opt.required ? "(Required)" : ""}`
                    }).join("\n")
                }`
            }
            else return cmd.description
        })() });
    }

    getEmbed() {
        return this.embed
    }
    getCtrlBtns() {
        return this.controlBtns
    }
    onePageOnly() {
        this.constructFinished = true;
        this.lastPage = 1;
        this.controlBtns.components[1].setDisabled(true);
    }

    async registerControlBtn(f0r, interaction, data=undefined) {
        const fucrBtnInteractionCollector = await (await interaction.fetchReply()).createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 15*60000
        })

        fucrBtnInteractionCollector.on("collect", async (fucrBtnInteraction) => {
            if(fucrBtnInteraction.customId === 'get_cmds_next_page') {
                if(f0r === "user") {
                    this.pageCharNum = 0;
                    this.embed.spliceFields(0, this.embed.data.fields ? this.embed.data.fields.length : 0)
                    this.cmdIdsLeft = this.totalFields.slice(this.totalFields.findIndex(f => f.name === this.nextCmdId), this.totalFields.length)
                    if(!this.pages[this.currentPage] && this.cmdIdsLeft.length > 0 && !this.constructFinished) {
                        for(const field of this.cmdIdsLeft) if(!(this.construct({ field }))) break;
                        
                        // Push the constructed page metadata
                        if (this.thisPageFieldsMetadata.length > 0) {
                            this.pages.push(this.thisPageFieldsMetadata);
                            this.thisPageFieldsMetadata = [];
                        }
                        
                        // console.log(this.cmdIdsLeft, this.nextCmdId, this.totalFields.slice(this.totalFields.findIndex(f => f.name === this.nextCmdId), this.totalFields.length));
                        if(this.cmdIdsLeft.length === this.totalFields.slice(this.totalFields.findIndex(f => f.name === this.nextCmdId), this.totalFields.length).length && this.cmdIdsLeft.every((id, i) => id === this.totalFields.slice(this.totalFields.findIndex(f => f.name === this.nextCmdId), this.totalFields.length)[i])){
                            this.constructFinished = true;
                            this.lastPage = this.currentPage;
                            this.controlBtns.components[1].setDisabled(true);
                        } else {
                            this.currentPage++;
                        }
                    } else if (this.constructFinished){
                        this.currentPage++;
                        for(let i = 0; i < this.pages[this.currentPage].length; i++) if(!(this.construct({ field: this.pages[this.currentPage][i] }))) break;
                    }
                } else if (f0r === "admin") {
                    const cmdIds = Object.keys(data);
                    // find a way to retrieve cmdIds
                    this.pageCharNum = 0;
                    this.embed.spliceFields(0, this.embed.data.fields ? this.embed.data.fields.length : 0)
                    this.cmdIdsLeft = cmdIds.slice(cmdIds.indexOf(this.nextCmdId), cmdIds.length)
                    if(!this.pages[this.currentPage] && this.cmdIdsLeft.length > 0 && !this.constructFinished) {
                        for(const cmdId of this.cmdIdsLeft) if(!(this.construct({ cmdId, cmdDetail: data[cmdId] }))) break;

                        // Push the constructed page metadata
                        if (this.thisPageFieldsMetadata.length > 0) {
                            this.pages.push(this.thisPageFieldsMetadata);
                            this.thisPageFieldsMetadata = [];
                        }
                        
                        // console.log(this.cmdIdsLeft, this.nextCmdId, cmdIds.slice(cmdIds.indexOf(this.nextCmdId), cmdIds.length));
                        if(this.cmdIdsLeft.length === cmdIds.slice(cmdIds.indexOf(this.nextCmdId), cmdIds.length).length && this.cmdIdsLeft.every((id, i) => id ===cmdIds.slice(cmdIds.indexOf(this.nextCmdId), cmdIds.length)[i])){
                            this.constructFinished = true;
                            this.lastPage = this.currentPage;
                            this.controlBtns.components[1].setDisabled(true);
                        } else {
                            this.currentPage++;
                        }
                    } else if (this.constructFinished){
                        this.currentPage++;
                        for(let i = 0; i < this.pages[this.currentPage].length; i++) if(!(this.construct({ cmdId: this.pages[this.currentPage][i].cmdId, cmdDetail: this.pages[this.currentPage][i].cmdDetail}))) break;
                    }
                }
            } else if(fucrBtnInteraction.customId === 'get_cmds_prev_page') {
                this.currentPage--;
                this.pageCharNum = 0;
                this.embed.spliceFields(0, this.embed.data.fields ? this.embed.data.fields.length : 0)
                for(let i = 0; i < this.pages[this.currentPage].length; i++){ 
                    if(f0r === "user" && !(this.construct({ field: this.pages[this.currentPage][i] }, { next: false }))) break;
                    else if (f0r === "admin" && !(this.construct({ cmdId: this.pages[this.currentPage][i].cmdId, cmdDetail: this.pages[this.currentPage][i].cmdDetail }, { next: false }))) break; 
                }
            }
            if(this.constructFinished && this.currentPage > 0) this.controlBtns.components[0].setDisabled(false);
            else this.controlBtns.components[0].setDisabled(true);
            if(this.constructFinished) {
                if(this.currentPage < this.lastPage) this.controlBtns.components[1].setDisabled(false);
                else this.controlBtns.components[1].setDisabled(true);
            }
            await interaction.editReply({ embeds: [this.embed], components: [this.controlBtns], ephemeral: true });
            fucrBtnInteraction.deferUpdate({ timeout: 15 * 60000 });
        })
    }
}