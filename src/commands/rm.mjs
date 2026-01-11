import { EmbedBuilder } from "discord.js";

export default async function getRoleMembers(guild, method=undefined, reqrole=undefined){
    const rmMessage = new EmbedBuilder()
        .setTitle("Member's Roles")
        .setDescription("Here are all members in each role")
        .setColor("#000000")
    
    let guildRolesData = [];
    let fetchingRoleMembersData = [];

    function addMemberToRole(r, c) {
        const membersInRole = r.members;
        let roled_members = [];
        membersInRole.forEach((m) => roled_members.push({ name: m.user.tag, id: m.user.id }));
        c.push({ roleName: r.name, members: roled_members });
    }

    for(const role of guild.roles.cache.values()){
        if(method === "cmd-admin-whois"){
            // reqrole acts as granted_perm here.
            rmMessage.setTitle("Admin Permission Roles");
            rmMessage.setDescription("Here are members with admin permissions")
            rmMessage.setColor("#00FF00");
            if(reqrole.permitted.roles.includes(role.name)) addMemberToRole(role, guildRolesData);
        } else {
            if(role.members.size === 0) continue;
            addMemberToRole(role, guildRolesData);
        }
    };

    if(method === "cmd-admin-whois"){
        rmMessage.addFields({ name: "Owner", value: `<@${reqrole.owner}>` })
        rmMessage.addFields({ name: "Administrators", value: reqrole.admin.map(aid => `<@${aid}>`).join("\n") || "No admins found." })
        rmMessage.addFields({ name: "Permitted Users", value: reqrole.permitted.users.map(uid => `<@${uid}>`).join("\n") || "No permitted users found." })
    }

    guildRolesData.forEach((r) => {
        switch(method){
            case "cmd-rm": case "cmd-admin-whois":
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
        case "cmd-rm": case "cmd-admin-whois":
            return rmMessage.data;
        case "fetch":
            return fetchingRoleMembersData;
    };
}