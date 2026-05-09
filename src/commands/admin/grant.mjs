import getRoleMembers from "../rm.mjs"
import { AdminPermissions } from "../../schema.mjs"
import { GrantedPerms } from "./main.mjs";
import { MessageFlags } from "discord.js";

export default async function grant_admin(interaction, amr, amu, gp) {
    let errMessage;
    let ok = true;
    if(amr) {
        for(const r of amr) {
            const uidInR = await getRoleMembers(interaction.guild, "fetch", r)
            if(uidInR.length === 0){
                errMessage = `Role ${r} does not exist in this server.`
                ok = false;
                break;
            }
            gp.permitted.roles.push(r);
        } 
    }
    if(amu) {
        for(const u of amu) {
            const the_user = await interaction.guild.members.fetch({ query: u, limit: 1 });
            if(the_user.size === 0){
                errMessage = `User ${u} does not exist in this server.`
                ok = false;
                break;
            }
            gp.permitted.users.push(the_user.first().user.id);
        }
    }
    
    GrantedPerms.set(interaction.guild.id, gp);
    await AdminPermissions.findOneAndUpdate({ gid: interaction.guild.id }, { perms: gp });
    // fs.writeFileSync(`./admin_perm/${interaction.guild.name}.json`, JSON.stringify(gp));

    const success = async (interaction) => {
        await interaction.followUp({ content: `Successfully granted admin permission.`, flags: MessageFlags.Ephemeral });
    };
    const error = async (interaction) => {
        await interaction.followUp({ content: errMessage, flags: MessageFlags.Ephemeral });
    };

    return { success, error, ok }
}