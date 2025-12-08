import { EmbedBuilder } from "discord.js";

export default async function getRoleMembers(guild, method=undefined, reqrole=undefined){
    const rmMessage = new EmbedBuilder()
        .setTitle("Member's Roles")
        .setDescription("Here are all members in each role")
        .setColor("#000000")
    
    let guildRolesData = [];
    let fetchingRoleMembersData = [];

    await guild.members.fetch();
    for(const role of guild.roles.cache.values()){
        const membersInRole = role.members;
        let roled_members = [];
        membersInRole.forEach((m) => roled_members.push({ name: m.user.tag, id: m.user.id }));
        guildRolesData.push({ roleName: role.name, members: roled_members });
    };

    guildRolesData.forEach((r) => {
        switch(method){
            case "cmd-msg":
                let showingMemberName = [];
                r.members.forEach((m) => showingMemberName.push(m.name));
                rmMessage.addFields({ name: r.roleName, value: showingMemberName.join("\n") });
                break;
            case "fetch":
                if(r.roleName === reqrole) r.members.forEach((m) => fetchingRoleMembersData.push(m.id));
                break;
        };
    });

    switch(method){
        case "cmd-msg":
            return rmMessage.data;
        case "fetch":
            return fetchingRoleMembersData;
    };
}