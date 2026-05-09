const http = require('http');

// fake server
http.createServer((req, res) => {
  res.write('Bot is Online!');
  res.end();
}).listen(8080);


const { Client, GatewayIntentBits } = require('discord.js');
const { default: mongoose } = require('mongoose');
const { commandJobs, modalJobs, buttonJobs } = require("./commands/main.mjs");
const { adminPermInit } = require('./commands/admin/main.mjs');
const Commands = require('./commands/init.mjs').default;
require('dotenv').config();

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
	],
});

client.once('clientReady', async () => {
    await mongoose.connect(process.env.MONGODB_URI);

    // Auto init every time when update/restart.
    for(const guild of client.guilds.cache.values()) {
        await adminPermInit(guild);
        await Commands.init(guild.id);
    }
    console.log(`Logged in as ${client.user.tag}`);

    client.user.setPresence({
        activities: [{
            name: "Hi, I'm Daisey! Please to serve you! | /help",
        }],
        status: "online"
    })
});

client.on('guildCreate', async (guild) => {
    await adminPermInit(guild);
    await Commands.init(guild.id);
})
  
client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton()) await buttonJobs(interaction);
    if (interaction.isModalSubmit()) await modalJobs(interaction);
    if (interaction.isCommand()) await commandJobs(interaction);
});

// Chatbot message detection and response event handler
client.on('messageCreate', Commands.utility_functions.handleChatbotMsg)


client.login(process.env.DAISEY_BOT_TOKEN);