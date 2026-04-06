import { nanoid } from 'nanoid';
import { MessageFlags, PermissionsBitField, ChannelType } from 'discord.js';
import { GoogleGenAI } from '@google/genai';
import { UserChatbotHistory, PublicChatbotHistory } from '../schema.mjs';
import dotenv from 'dotenv';
dotenv.config();

// Chatbot initialization
let chatbotConfigs = new Map();

// preload *necessary* data
async function preloadCBC() {
    chatbotConfigs.clear();
    const allpublic = await PublicChatbotHistory.find();
    const alluser = await UserChatbotHistory.find();
    alluser.forEach(user => {
        user.chats.forEach(chat => {
            chatbotConfigs.set(chat.chatId, {
                chatName: chat.chatName,
                isTyping: chat.isTyping,
                isActive: chat.isActive,
                userCreated: chat.userCreated,
            });
        });
    });
    allpublic.forEach(p => {
        p.chats.forEach(chat => {
            chatbotConfigs.set(chat.chatId, {
                chatName: chat.chatName,
                isTyping: chat.isTyping,
                isActive: chat.isActive,
                userCreated: chat.userCreated,
            });
        });
    });
};

setInterval(preloadCBC, 1000 * 60 * 10); // refresh every 10 mins to sync with the changes.
preloadCBC();

export function getChatbotConfigs(chid=undefined){
    if(chid) return chatbotConfigs.get(chid);
    return chatbotConfigs;
}

// Todo: Migrate to MongoDB [DONE!]
// Point of consideration
// - await preloadCBC() <- maybe don't wait this function to complete.
// - figure out a way to *preloadCBC()* optimally, instead of rewrite the whole object.

/*

Gemini recommendation

A 10-minute refresh cycle is a solid "middle-ground" strategy! It’s much better than hammer-querying MongoDB for every single message a Discord bot sees. However, since you're already optimizing, there's a more "pro" way to handle this that's even lighter on your database and more accurate for your users.

Here’s a breakdown of how to level up that cache system:
1. The "10-Minute Refresh" Risk

The main issue with a timed refresh (polling) is Stale Data. 
If you update a setting in MongoDB, your bot won't "know" for up to 10 minutes.

If your bot restarts (common on Render), it has to re-fetch everything at once, which can cause a "boot-up lag."

2. The Better Way: "Cache Aside" (Lazy Loading)
Instead of refreshing everything every 10 minutes, only fetch what you need, when you need it, and keep it until it "expires."

JavaScript

const cache = new Map();

async function getGuildSettings(guildId) {
    // 1. Check local memory first
    if (cache.has(guildId)) {
        return cache.get(guildId);
    }

    // 2. Cache miss? Fetch from Mongo
    const settings = await GuildModel.findOne({ guildId }).lean();
    
    // 3. Store in memory for future use
    cache.set(guildId, settings);
    return settings;
}

3. The "Event-Driven" Invalidation (The Secret Sauce)
Instead of a timer, clear the cache only when data changes. Since you’re using MongoDB, you can use Change Streams to let the database "tell" the bot when to refresh.

JavaScript

// This stays running in the background
const changeStream = GuildModel.watch();

changeStream.on('change', (change) => {
    if (change.operationType === 'update' || change.operationType === 'replace') {
        const id = change.documentKey._id;
        // Delete from local cache so the next request fetches the fresh version
        cache.delete(id.toString()); 
        console.log(`Cache invalidated for ${id}`);
    }
});

Result: Your bot uses 0 queries for repeated reads, but updates instantly when the database changes.

4. Comparison of Strategies

Strategy        DB Load               Accuracy      Complexity               
No Cache        High (Every message)  100%          Low           
10-Min Timer    Low (Batch)           80% (Stale)   Medium
Event-Driven    Lowest                100%          High

Pro-Tip: Use .lean()
If you are just reading data for your cache and don't need to call .save() on the result later, always add .lean() to your Mongoose queries:

const data = await Model.find().lean();

This skips the heavy Mongoose "Document" overhead and just gives you a plain Javascript object, making your cache much faster and lighter on RAM.

Are you currently using a simple Object or a Map for your cache, or did you pull in something like node-cache?

Conclusion: I may try lazy load. Event-driven is too much work for ts.
*/
export async function createHistory(chatName, chatId, id, user=false){
    if(user){
        const u = await UserChatbotHistory.findOne({ uid: id })
        if(!u) await UserChatbotHistory.create({ uid: id, chats: [] }, { new: true })
        u.chats.push({ chatName, chatId, userCreated: true })
        await u.save();
    }
    else{
        const p = await PublicChatbotHistory.findOne({ gid: id })
        if(!p) await PublicChatbotHistory.create({ gid: id, chats: [] }, { new: true })
        p.chats.push({ chatName, chatId });
        await p.save();
    }
}

export async function preserveHistory(prev_aiiid, message, userCreated=false){
    if(userCreated) {
        const u = await UserChatbotHistory.findOne({ uid: message.author.id })
        u.chats = u.chats.map(chat => chat.chatId === message.channel.id ? { ...chat, prev_aiiid } : chat);
        await u.save();
    } else {
        const p = await PublicChatbotHistory.findOne({ gid: message.guild.id })
        p.chats = p.chats.map(chat => chat.chatId === message.channel.id ? { ...chat, prev_aiiid } : chat);
        await p.save();
    }
}

export async function getChatbotTextResponse(prompt, message, userCreated=false){
    // api key dashboard -> https://aistudio.google.com/api-keys?project=gen-lang-client-0994940610
    const aichatbot = new GoogleGenAI({ apiKey: process.env.GEMINI_AI_KEY });
    try {
        let historyChats
        if(userCreated){
            const u = await UserChatbotHistory.findOne({ uid: message.author.id })
            historyChats = u.chats.find(chat => chat.chatId === message.channel.id);
        } else {
            const p = await PublicChatbotHistory.findOne({ gid: message.guild.id })
            historyChats = p.chats.find(chat => chat.chatId === message.channel.id);
        }
        const ai_interaction = await aichatbot.interactions.create({
            model: 'gemini-2.5-flash-lite', // most optimal ig.
            input: prompt,
            previous_interaction_id: historyChats?.prev_aiiid || null
        })
        const ai_response = ai_interaction.outputs[ai_interaction.outputs.length - 1].text;
        return { ai_response, aiiid: ai_interaction.id, error: null }
    } catch (error) {
        console.error("Error getting AI response:", error);
        return { ai_response: null, aiiid: null, error }
    };
}

export async function chatbot(interaction) {
    if(interaction.options.getString("action") === "start"){
        if(interaction.options.getString("scope") === "c") {
            await interaction.deferReply();

            if(chatbotConfigs.has(interaction.channel.id) && chatbotConfigs.get(interaction.channel.id).isActive){
                await interaction.followUp("Chatbot behavior is already active");
                return;
            }
            await createHistory(`${interaction.channel.name}-${nanoid()}`, interaction.channel.id, interaction.guild.id)
            await preloadCBC();
            await interaction.followUp("Chatbot behavior is now active, using Gemini 2.5 Flash Lite \nNote: The chatbot won't process your messages if it's typing");
        } else if(interaction.options.getString("scope") === "p"){
            const cleanedChatname = interaction.options.getString("chatname")?.replace(/[^a-zA-Z0-9]/g, ''); // temporary, will find a more efficient pattern later.
            if(Array.from(chatbotConfigs.values()).some(config => config.chatName === cleanedChatname)){
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
            await createHistory(cleanedChatname || `${interaction.user.username}-${nanoid()}`, newChat.id, interaction.user.id, true);
            await preloadCBC();

            interaction.client.channels.cache.get(newChat.id).send("Chatbot behavior is now active, using Gemini 2.5 Flash Lite");
            interaction.client.channels.cache.get(newChat.id).send("Note: The chatbot won't process your messages if it's typing");
        }
        else await interaction.reply({ content: "Invalid scope option", flags: MessageFlags.Ephemeral });
    } else if(interaction.options.getString("action") === "stop") {
        await interaction.deferReply();
        const currentChannelConfig = chatbotConfigs.get(interaction.channel.id);
        if (!currentChannelConfig?.isActive){
            await interaction.followUp("Chatbot behavior is not active");
            return;
        }
        await interaction.followUp("Chatbot behavior is now inactive");
        if(currentChannelConfig?.userCreated){ 
            interaction.guild.channels.delete(interaction.channel.id);
            await UserChatbotHistory.findOneAndUpdate({ uid: interaction.user.id }, { $pull: { chats: { chatId: interaction.channel.id } } });
        } else {
            await PublicChatbotHistory.findOneAndUpdate({ gid: interaction.guild.id }, { $pull: { chats: { chatId: interaction.channel.id } } });
        }
        await preloadCBC();
        // fs.unlinkSync(currentChannelConfig.chatHistoryFile);
    }
}