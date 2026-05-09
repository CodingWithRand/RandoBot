import { 
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelSelectMenuBuilder, 
    CheckboxBuilder, 
    LabelBuilder, 
    MessageFlags, 
    ModalBuilder,
    RoleSelectMenuBuilder,
    StringSelectMenuBuilder, 
    TextInputBuilder, 
    TextInputStyle 
} from "discord.js";
import { nanoid } from "nanoid";
import { Gates } from "../../schema.mjs";

// Data structure
// [id]: {
//      questions: [{
//          q: String,
//          q_type: String,
//          answer_constraint_operator: String,
//          answer_constraint: String,
//      }],
//      greeting_msg: String,
//      access_role: String
//      announcement_channel: String
// }
export const gates = new Map();
async function loadGates() {
    const gatesData = await Gates.find()
    gatesData.forEach(gate => gates.set(gate.id, {
        id: gate.id,
        questions: gate.questions,
        greeting_msg: gate.greeting_msg,
        access_role: gate.access_role,
        announcement_channel: gate.announcement_channel,
        collect_data: gate.collect_data,
        data_constraint: gate.data_constraint,
        gate_data: gate.gate_data
    }));
}

loadGates();

function textInputQuestion(modalId, p, nq, modal) {
    const questionInput = new LabelBuilder()
        .setLabel(`Filter Question (${p-1} of ${nq})`)
        .setTextInputComponent(
            new TextInputBuilder()
                .setCustomId(`question${modalId}`)
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
        );
    const answerConstraintOperatorInput = new LabelBuilder()
        .setLabel("Answer Constraint Operator")
        .setDescription("Provide a way to check and validate user's answer.")
        .setStringSelectMenuComponent(
            new StringSelectMenuBuilder()
                .setCustomId(`answer_constraint_operator${modalId}`)
                .setPlaceholder('Select a constraint operator.')
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions({
                    label: "Contains",
                    value: "contains",
                })
                .addOptions({
                    label: "Equals (Case Sensitive)",
                    value: "===",
                })
                .addOptions({
                    label: "Equals (Case Insensitive)",
                    value: "equals",
                })
                .addOptions({
                    label: "Starts With",
                    value: "startsWith",
                })
        )
        // More in the future.
    const answerConstraintInput = new LabelBuilder()
        .setLabel("Answer Constraint")
        .setDescription("Answer to be checked and validated with selected operator.")
        .setTextInputComponent(
            new TextInputBuilder()
                .setCustomId(`answer_constraint${modalId}`)
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
        )
    // Only support text for now.
    const nextQuestionType = new LabelBuilder()
        .setLabel("Next question type")
        .setStringSelectMenuComponent(
            new StringSelectMenuBuilder()
                .setCustomId(`next_question_type${modalId}`)
                .setPlaceholder('Select a question type for the next question.')
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions({
                    label: "Text",
                    value: "text",
                })
        )

    modal.addLabelComponents(
        questionInput,
        answerConstraintOperatorInput,
        answerConstraintInput
    )
    if(p <= nq) modal.addLabelComponents(nextQuestionType);
    
    return modal;
}

function gateSetupEnd(modalId, modal) {
    const collectDataInput = new LabelBuilder()
        .setLabel("Collect Data?")
        .setDescription("Do you want to collect answers from those filter questions? (The data will be used in filtering.)")
        .setCheckboxComponent(
            new CheckboxBuilder()
                .setCustomId(`collect_data${modalId}`)
                .setDefault(false)
        )
    
    const dataConstraint = new LabelBuilder()
        .setLabel("Data Constraint")
        .setDescription("How do you want to use the data to accept in users? (Leave blank if you don't collect data.)")
        .setStringSelectMenuComponent(
            new StringSelectMenuBuilder()
                .setCustomId(`data_constraint${modalId}`)
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions({
                    label: "Unique",
                    value: "unique",
                })
                .setRequired(false)
        )
    
    modal.addLabelComponents(
        collectDataInput,
        dataConstraint
    )

    return modal;
}

async function filterQuestionModalOpenBTNs(interaction, mid, end=false) {
    // await interaction.deferUpdate();

    const continueOrAbort = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`gs_continue_${end ? "end" : ""}${mid}`)
                .setLabel('Continue')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`gs_abort_${mid}`)
                .setLabel('Abort')
                .setStyle(ButtonStyle.Secondary)
        )
    
    let thisInteraction;
    // console.log(gates.get(mid).setup.current_interaction)
    if(gates.get(mid).setup.current_interaction) {
        thisInteraction = gates.get(mid).setup.current_interaction;
        await interaction.deferUpdate();
        if (end) await thisInteraction.editReply({ content: `Collect Data Policy`, components: [continueOrAbort], flags: MessageFlags.Ephemeral });
        else await thisInteraction.editReply({ content: `Filter Question - Page ${gates.get(mid).setup.current_question} of ${gates.get(mid).setup.q_number}`, components: [continueOrAbort], flags: MessageFlags.Ephemeral })
    } else {
        await interaction.reply({ content: `Page ${gates.get(mid).setup.current_question} of ${gates.get(mid).setup.q_number}`, components: [continueOrAbort], flags: MessageFlags.Ephemeral })
        thisInteraction = interaction;
    }
    
    gates.set(mid, {
        ...gates.get(mid),
        setup: {
            ...gates.get(mid).setup,
            current_interaction: thisInteraction,
            current_question: gates.get(mid).setup.current_question + 1
        }
    })
} 

export async function gateSetup(interaction) {
    const gateSetupModal = new ModalBuilder()
        .setCustomId('gs_modal_0')
        .setTitle('Gate Setup');

    const greetingMsgInput = new LabelBuilder()
        .setLabel("Greeting Message")
        .setDescription("Tell new users how to get access to your server.")
        .setTextInputComponent(
            new TextInputBuilder()
                .setCustomId('greeting_msg')
                .setPlaceholder('Tell new users how to get access to your server.')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false)
        )   
    // I think giving only one role per gate is enough.
    const accessRoleInput = new LabelBuilder()
        .setLabel("Access Role")
        .setDescription("Give users this role to access to your server.")
        .setRoleSelectMenuComponent(
            new RoleSelectMenuBuilder()
                .setCustomId('access_role')
                .setPlaceholder('Select a role to give to user to access to your server.')
                .setMinValues(1)
                .setMaxValues(1)
        )
    const announcementChannelInput = new LabelBuilder()
        .setLabel("Announce this gate to...")
        .setDescription("Where users can find this gate to gain access to your server?")
        .setChannelSelectMenuComponent( 
            new ChannelSelectMenuBuilder()
                .setCustomId('announcement_channel')
                .setPlaceholder('Select a channel to send this gate announcements.')
                .setMinValues(1)
                .setMaxValues(1)
        )
    // Consider limiting to 5 questions.
    const numberOfQsInput = new LabelBuilder()
        .setLabel("Number of Filter Questions")
        .setStringSelectMenuComponent(
            new StringSelectMenuBuilder()
                .setCustomId('nq')
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions({
                    label: "0",
                    value: "0",
                })
                .addOptions({
                    label: "1",
                    value: "1",
                })
                .addOptions({
                    label: "2",
                    value: "2",
                })
                .addOptions({
                    label: "3",
                    value: "3",
                })
                .addOptions({
                    label: "4",
                    value: "4",
                })
                .addOptions({
                    label: "5",
                    value: "5",
                })
                
        )
    // Only support text for now.
    const nextQuestionType = new LabelBuilder()
        .setLabel("First question type")
        .setStringSelectMenuComponent(
            new StringSelectMenuBuilder()
                .setCustomId('next_question_type')
                .setPlaceholder('Select a question type for the first question.')
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions({
                    label: "Text",
                    value: "text",
                })
        )
        
    // Modals need each input to be in its own ActionRow
    gateSetupModal.addLabelComponents(
        greetingMsgInput,
        accessRoleInput,
        announcementChannelInput,
        numberOfQsInput,
        nextQuestionType
    )

    await interaction.showModal(gateSetupModal);   
}

function gate(setupData, modal) {
    for(const [qi, q] of setupData.questions.entries()) {
        switch(q.q_type) {
            case "text":
                const question = new LabelBuilder()
                    .setLabel(q.q)
                    .setTextInputComponent(
                        new TextInputBuilder()
                            .setCustomId(`q-${qi}`)
                            .setStyle(TextInputStyle.Short) // Only short for now, will make the system to support paragraph later.
                            .setRequired(true)
                    )
                modal.addLabelComponents(question);
                break;
        }
    }
    return modal
}

export const GateSetupActions = {
    Button: {
        continue: async (interaction) => {
            const modalId = interaction.customId.split("gs_continue_")[1];
            const gateSetupModal = new ModalBuilder()
                .setCustomId(`gs_modal_${modalId.startsWith("end") ? modalId.slice(3) : modalId}`)
                .setTitle('Gate Setup');

            if(modalId.startsWith("end")) return await interaction.showModal(gateSetupEnd(modalId.slice(3), gateSetupModal));
            
            const p = gates.get(modalId).setup.current_question;
            const q_number = gates.get(modalId).setup.q_number;
            const nqt = gates.get(modalId).questions[p - 2].q_type;
            switch(nqt) {
                case "text":
                    // Cannot show modal after submitting a modal. Can now, with awaitModalSubmit
                    // TODO: Make a button to show the next setup modal instead of showing immediately
                    await interaction.showModal(textInputQuestion(modalId, p, q_number, gateSetupModal))
                    break;
            }
        },
        abort: async (interaction) => {
            const modalId = interaction.customId.split("gs_abort_")[1];
            gates.delete(modalId);
            if(gates.get(modalId).setup.current_interaction) await gates.get(modalId).setup.current_interaction.editReply({ content: "Gate creation aborted.", components: [], flags: MessageFlags.Ephemeral });
            else interaction.reply({ content: "Gate creation aborted.", flags: MessageFlags.Ephemeral });
        }
    },
    Modal: {
        submit: async (interaction) => {
            const modalId = interaction.customId.split("gs_modal_")[1];
            if(Number(modalId) === 0) {
                const page = modalId;
                const nq = Number(interaction.fields.getStringSelectValues('nq')[0]);
                if(isNaN(nq) || nq < 0) return interaction.reply({ content: "Invalid number of filter questions", flags: MessageFlags.Ephemeral });

                const newModalId = nanoid();
                gates.set(newModalId, {
                    questions: [{
                        q: null,
                        q_type: interaction.fields.getStringSelectValues("next_question_type")[0],
                        answer_constraint_operator: null,
                        answer_constraint: null
                    }],
                    greeting_msg: interaction.fields.getTextInputValue('greeting_msg'),
                    access_role: interaction.fields.getField('access_role').values[0],
                    announcement_channel: interaction.fields.getField('announcement_channel').values[0],
                    setup: {
                        q_number: nq,
                        current_question: Number(page) + 1,
                        current_interaction: null,
                        status: "constructing"
                    }
                })

                if(nq === 0) {
                    const completeGate = gates.get(modalId);
                    completeGate["questions"] = [];
                    delete completeGate["setup"];
                    completeGate["id"] = modalId;
                    gates.set(modalId, completeGate);
                    
                    await Gates.create(completeGate);
                    const enterGateBTN = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`g_${modalId}`)
                                .setLabel('Enter Gate')
                                .setStyle(ButtonStyle.Primary)
                        )
                    await interaction.guild.channels.cache.find((channel) => channel.id === gates.get(modalId).announcement_channel).send({ content: gates.get(modalId).greeting_msg, components: [enterGateBTN] })
                    return interaction.reply({ content: `Successfully created a gate! (No filter questions). Gate announcement has been sent to <#${gates.get(modalId).announcement_channel}>`, flags: MessageFlags.Ephemeral });
                }
                
                return await filterQuestionModalOpenBTNs(interaction, newModalId)
            }

            if(gates.get(modalId).setup.status === "almost_done") {
                gates.get(modalId).setup.current_interaction.editReply({ content: `Successfully created a gate! Gate announcement has been sent to <#${gates.get(modalId).announcement_channel}>`, components: [], flags: MessageFlags.Ephemeral });
                const completeGate = gates.get(modalId);
                delete completeGate["setup"];
                completeGate["id"] = modalId;
                completeGate["collect_data"] = interaction.fields.getCheckbox(`collect_data${modalId}`);
                completeGate["data_constraint"] = interaction.fields.getStringSelectValues(`data_constraint${modalId}`)[0];
                if(completeGate.collect_data) completeGate["gate_data"] = [];
                gates.set(modalId, completeGate);
                
                await Gates.create(completeGate);
                const enterGateBTN = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`g_${modalId}`)
                            .setLabel('Enter Gate')
                            .setStyle(ButtonStyle.Primary)
                    )
                await interaction.guild.channels.cache.find((channel) => channel.id === gates.get(modalId).announcement_channel).send({ content: gates.get(modalId).greeting_msg, components: [enterGateBTN] })
                // Note: announcement_channel and access_role are in ids
                // console.log(gates.get(modalId))
                await interaction.deferUpdate();
                return;
            }

            const p = gates.get(modalId).setup.current_question;
            const q_number = gates.get(modalId).setup.q_number;
            
            // console.log(previous_p, q_number)
            if (p <= q_number) {
                gates.get(modalId).questions.push({
                    q: null,
                    q_type: interaction.fields.getStringSelectValues(`next_question_type${modalId}`)[0],
                    answer_constraint_operator: null,
                    answer_constraint: null
                })
            }

            const Q = gates.get(modalId).questions;

            Q[p - 2] = {
                ...Q[p - 2],
                q: interaction.fields.getTextInputValue(`question${modalId}`),
                answer_constraint_operator: interaction.fields.getStringSelectValues(`answer_constraint_operator${modalId}`)[0],
                answer_constraint: interaction.fields.getTextInputValue(`answer_constraint${modalId}`)
            }
            gates.set(modalId, {
                ...gates.get(modalId),
                questions: Q,
            })

            if (p > q_number) {
                gates.set(modalId, {
                    ...gates.get(modalId),
                    setup: {
                        ...gates.get(modalId).setup,
                        status: "almost_done"
                    }
                })
                return await filterQuestionModalOpenBTNs(interaction, modalId, true);
            }

            await filterQuestionModalOpenBTNs(interaction, modalId);
        }
    }
}

const GateAnswerProcess = {
    text: async ({ q, qi, gateId, COOKIE_CUTTER_REJECT_MSG }, interaction) => {
        const modalAnswer = interaction.fields.getTextInputValue(`q-${qi}`);
        switch (q.answer_constraint_operator) {
            case "contains":
                if (!modalAnswer.includes(q.answer_constraint)) {
                    await interaction.reply({ content: COOKIE_CUTTER_REJECT_MSG, flags: MessageFlags.Ephemeral });
                    return false;
                }
                break;
            case "===":
                if (modalAnswer !== q.answer_constraint) {
                    await interaction.reply({ content: COOKIE_CUTTER_REJECT_MSG, flags: MessageFlags.Ephemeral });
                    return false 
                }
                break;
            case "equals":
                if (modalAnswer.toLowerCase() !== q.answer_constraint.toLowerCase()) {
                    await interaction.reply({ content: COOKIE_CUTTER_REJECT_MSG, flags: MessageFlags.Ephemeral });
                    return false;
                }
                break;
            case "startsWith":
                if (!modalAnswer.startsWith(q.answer_constraint)) {
                    await interaction.reply({ content: COOKIE_CUTTER_REJECT_MSG, flags: MessageFlags.Ephemeral });
                    return false;
                }
                break;
        }
        if (Array.isArray(gates.get(gateId).gate_data)) {
            switch (gates.get(gateId).data_constraint) {
                case "unique":
                    if (gates.get(gateId).gate_data.includes(modalAnswer)) {
                        await interaction.reply({ content: "You or someone with this answer has already entered this gate", flags: MessageFlags.Ephemeral });
                        return false
                    }
                    break;
            }
        }
        if (gates.get(gateId).collect_data) {
            const addedGateData = [...gates.get(gateId).gate_data, modalAnswer];
            gates.set(gateId, { ...gates.get(gateId), gate_data: addedGateData });
            await Gates.findOneAndUpdate({ id: gateId }, { gate_data: addedGateData });
        }
        return true;
    }
}

export const GateActions = {
    Button: {
        enter: async (interaction) => {
            const gateId = interaction.customId.split("g_")[1]
            const gateSetup = gates.get(gateId);
            if(gateSetup && !gateSetup.setup) {
                const gateModal = new ModalBuilder()
                    .setCustomId(`g_modal_${gateId}`)
                    .setTitle("Gate Entry");
                await interaction.showModal(gate(gateSetup, gateModal));
            }
        }
    },
    Modal: {
        submit: async (interaction) => {
            const gateId = interaction.customId.split("g_modal_")[1];
            if (gates.has(gateId)) {
                const COOKIE_CUTTER_REJECT_MSG = "You are not authorized to enter this gate (No access to the server)"
                for (const [qi, q] of gates.get(gateId).questions.entries()) {
                    switch (q.q_type) {
                        case "text":
                            if(!await GateAnswerProcess.text({ q, qi, gateId, COOKIE_CUTTER_REJECT_MSG }, interaction)) return;
                            break;
                    }
                }
                
                try {
                    await interaction.member.roles.add(interaction.guild.roles.cache.get(String(gates.get(gateId).access_role)));
                } catch (e) {
                    await interaction.reply({ content: "There was an error granting you access role.", flags: MessageFlags.Ephemeral });
                }
                await interaction.deferUpdate();
            }
        }
    }
}