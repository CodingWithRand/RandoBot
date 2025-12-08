const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const { chatbotConfigs } = require('./commands/chatbot.mjs');
const Commands = require('./commands/init.mjs').default;
require('dotenv').config();

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
	],
});

// Admin command initialization
const initted = new Map();
const granted_perm = {
    owner: null,
    admin: [],
    permitted_users: []
}

client.once('ready', () => {
    Commands.init();
    Commands.init(process.env.SERVER_ID); // for testing purpose, deleting it when deployed.
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('guildCreate', async (guild) => {
    await Commands.init(guild.id);
    const guild_members = await guild.members.fetch();
    granted_perm.owner = guild.ownerId;
    guild_members.forEach((gm) => {
        if(gm.permissions.has(PermissionsBitField.Flags.Administrator)) granted_perm.admin.push(gm.id);
    })
})
  
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;
    switch(interaction.commandName){
        case 'date': 
            await interaction.deferReply();
            if(Array.from(Commands.commands_list.get(interaction.guild.id), ([,cmdData]) => (cmdData)).findIndex(cmd => cmd.name === "date") === -1){
                await interaction.followUp({ content: "The command is not available in this server as it may have been deleted." });
                break;
            }
            await interaction.followUp(Commands.command_funcs.getDate(interaction));
            break;
        case 'rm':
            await interaction.deferReply({ ephemeral: true });
            if(Array.from(Commands.commands_list.get(interaction.guild.id), ([,cmdData]) => (cmdData)).findIndex(cmd => cmd.name === "rm") === -1){
                await interaction.followUp({ content: "The command is not available in this server as it may have been deleted." });
                break;
            }
            await interaction.followUp({ embeds: [await Commands.command_funcs.getRoleMembers(interaction.guild, "cmd-msg")], ephemeral: true });
            break;
        case 'chatbot':
            if(Array.from(Commands.commands_list.get(interaction.guild.id), ([,cmdData]) => (cmdData)).findIndex(cmd => cmd.name === "chatbot") === -1){
                await interaction.reply({ content: "The command is not available in this server as it may have been deleted." });
                break;
            }
            await Commands.command_funcs.chatbot(interaction);
            break;
        case 'image':
            interaction.deferReply({ timeout: 60000 });
            if(Array.from(Commands.commands_list.get(interaction.guild.id), ([,cmdData]) => (cmdData)).findIndex(cmd => cmd.name === "image") === -1){
                await interaction.followUp({ content: "The command is not available in this server as it may have been deleted." });
                break;
            }
            await Commands.command_funcs.image(interaction)
            break;
        case 'help':
            await interaction.deferReply({ ephemeral: true });
            await Commands.command_funcs.help(interaction);
            break;
        case 'admin':
            await interaction.deferReply({ ephemeral: true });
            await Commands.command_funcs.admin(client, interaction, initted, granted_perm);
            break;
    }   
    client.guilds.cache.get()
});

// Chatbot message detection and response event handler
client.on('messageCreate', async (message) => {
    if(message.author.bot) return;

    const currentChannelConfig = chatbotConfigs[message.channel.id]
    if(!currentChannelConfig) return;
    if(!currentChannelConfig?.isActive) return;
    if(currentChannelConfig.isTyping) return;
    
    message.channel.sendTyping();
    currentChannelConfig.isTyping = true;
    const typingStatus = setInterval(() => {
        if(message.channel) message.channel.sendTyping();
        if(!currentChannelConfig?.isActive) clearInterval(typingStatus);
    }, 9000);

    const { ai_response, error } = await Commands.utility_functions.getChatbotTextResponse(message.content, currentChannelConfig.chatHistoryFile);
    if(ai_response){
        Commands.utility_functions.preserveHistory({ role: "user", content: message.content }, currentChannelConfig.chatHistoryFile);
        const resChunks = [];
        let currentChunk = '';
        let charCount = 0;
        for (const char of ai_response) {
            if (charCount >= 1960) {
                resChunks.push(currentChunk);
                currentChunk = char;
                charCount = 1;
            } else {
                currentChunk += char;
                charCount++;
            }
        }
        if (currentChunk) resChunks.push(currentChunk);
        message.channel.send(`${message.author.toString()}`);
        for (const chunk of resChunks) message.channel.send(chunk);
    }
    else message.channel.send("Unable to get AI response");
    currentChannelConfig.isTyping = false;
    clearInterval(typingStatus);
})


client.login(process.env.BOT_TOKEN);

// module.exports = {
//     global: {
//         initted, 
//         granted_perm 
//     }
// }