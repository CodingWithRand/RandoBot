import fs from 'fs';
import fetch from 'node-fetch';
import { nanoid } from 'nanoid';
import { MessageFlags, PermissionsBitField, ChannelType } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

// Chatbot initialization
export let chatbotConfigs = {};

export function createHistoryFile(chatName, username=undefined){
    if(username){
        if(!fs.existsSync(`./chatbot_history/${username}`)) fs.mkdirSync(`./chatbot_history/${username}`);
        fs.writeFileSync(`./chatbot_history/${username}/${chatName}.json`, JSON.stringify({ messages: [] }));
        return `./chatbot_history/${username}/${chatName}.json`;
    }
    else{
        fs.writeFileSync(`./chatbot_history/public/${chatName}.json`, JSON.stringify({ messages: [] }));
        return `./chatbot_history/public/${chatName}.json`;
    }
}

export function preserveHistory(messageHistory, filePath){
    fs.readFile(filePath, (err, data) => {
        let json = [];
        if (!err && data) {
            try {
                json = JSON.parse(data); // parse existing JSON
            } catch (e) {
                console.error('Invalid JSON in file, starting fresh');
            }
        }

        // Step 2: Append new data
        json.messages.push(messageHistory);

        // Step 3: Write the updated array back
        fs.writeFile(filePath, JSON.stringify(json), (err) => {
            if (err) console.error(err);
            else console.log('History saved');
        });
    });
}

export async function getChatbotTextResponse(prompt, historyFile){
    try {
        const historyChats = JSON.parse(await fs.promises.readFile(historyFile))
        historyChats.messages.push({ role: 'user', content: prompt });
        const response = await fetch('https://text.pollinations.ai/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: historyChats.messages,
                model: 'openai',
                private: true  // Response won't appear in public feed
            })
        });
        const ai_response = await response.text();
        return { ai_response, error: null }
    } catch (error) {
        return { ai_response: null, error }
    };
}

export async function chatbot(interaction) {
    if(interaction.options.getString("action") === "start"){
        if(interaction.options.getString("scope") === "c") {
            await interaction.deferReply();
            if(chatbotConfigs[interaction.channel.id] && chatbotConfigs[interaction.channel.id].isActive){
                await interaction.followUp("Chatbot behavior is already active");
                return;
            }
            chatbotConfigs[interaction.channel.id] = {
                chatName: interaction.channel.name,
                chatHistoryFile: createHistoryFile(`${interaction.channel.name}-${nanoid()}`),
                isTyping: false,
                isActive: true
            }
            await interaction.followUp("Chatbot behavior is now active, using GPT-5 nano model from OpenAI \n Note: The chatbot won't process your messages if it's typing");
        } else if(interaction.options.getString("scope") === "p"){
            const cleanedChatname = interaction.options.getString("chatname")?.replace(/[^a-zA-Z0-9]/g, ''); // temporary, will find a more efficient pattern later.
            if(Object.values(chatbotConfigs).some(config => config.chatName === cleanedChatname)){
                await interaction.reply({ content: "Chat name is already in use", flags: MessageFlags.Ephemeral });
                return;
            }
            const newChat = await interaction.guild.channels.create({
                name: cleanedChatname || `${interaction.user.username}-${nanoid()}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    {
                        id: interaction.user.id,
                        allow: [ PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages ]
                    },
                    {
                        id: interaction.guild.roles.everyone,
                        deny: [ PermissionsBitField.Flags.ViewChannel ]
                    }
                ]
            })
            await interaction.reply({ content: `New private chatbot channel has been created: <#${newChat.id}>`, flags: MessageFlags.Ephemeral });
            chatbotConfigs[newChat.id] = {
                chatName: newChat.name,
                chatHistoryFile: createHistoryFile(cleanedChatname || `${interaction.user.username}-${nanoid()}`, interaction.user.username),
                isActive: true,
                isTyping: false,
                privateChat: true
            }
            interaction.client.channels.cache.get(newChat.id).send("Chatbot behavior is now active, using GPT-5 nano from OpenAI");
            interaction.client.channels.cache.get(newChat.id).send("Note: The chatbot won't process your messages if it's typing");
        }
        else await interaction.reply({ content: "Invalid scope option", flags: MessageFlags.Ephemeral });
    } else if(interaction.options.getString("action") === "stop") {
        await interaction.deferReply();
        const currentChannelConfig = chatbotConfigs[interaction.channel.id];
        if (!currentChannelConfig?.isActive){
            await interaction.followUp("Chatbot behavior is not active");
            return;
        }
        await interaction.followUp("Chatbot behavior is now inactive");
        if(currentChannelConfig?.privateChat) interaction.guild.channels.delete(interaction.channel.id);
        fs.unlinkSync(currentChannelConfig.chatHistoryFile);
        currentChannelConfig.chatHistoryFile = null;
        currentChannelConfig.isActive = false;
    }
}