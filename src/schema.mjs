import mongoose, { Mongoose } from "mongoose";

const ChatbotHistorySchema = new mongoose.Schema({
    chatName: { type: String, required: true },
    chatId: { type: String, required: true },
    prev_aiiid: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    isTyping: { type: Boolean, default: false },
    userCreated: { type: Boolean, default: false }
}, { timestamps: true })

export const UserChatbotHistory = mongoose.model(
    'user-chatbot-history', 
    new mongoose.Schema({ 
        uid: { type: String, required: true },
        chats: [ChatbotHistorySchema] 
    })
);

export const PublicChatbotHistory = mongoose.model(
    'public-chatbot-history',
    new mongoose.Schema({
        gid: { type: String, required: true },
        chats: [ChatbotHistorySchema]
    })
);

export const AdminPermissions = mongoose.model(
    'admin-perm',
    new mongoose.Schema({
        gid: { type: String, required: true },
        perms: new mongoose.Schema({
            owner: { type: String, required: true },
            admins: [String],
            permitted: new mongoose.Schema({
                roles: [String],
                users: [String]
            })
        })
    })
);

export const MusicPlaylists = mongoose.model(
    'music-playlist',
    new mongoose.Schema({
        uid: { type: String, required: true },
        playlists: { 
            type: Map, 
            of: new mongoose.Schema({
                tracks: { type: Map, of: String }
            }) 
        }
    })
)

export const Gates = mongoose.model(
    'gates',
    new mongoose.Schema({
        id: { type: String, required: true },
        questions: [
            new mongoose.Schema({
                q: { type: String, required: true },
                q_type: { type: String, required: true },
                answer_constraint_operator: { type: String, required: true },
                answer_constraint: { type: String, required: true }
            })
        ],
        greeting_msg: { type: String, required: false },
        access_role: { type: String, required: true },
        announcement_channel: { type: String, required: true },
        collect_data: { type: Boolean, required: true },
        data_constraint: { type: String, required: false, default: "None" },
        gate_data: []
    })
)