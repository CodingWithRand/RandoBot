import getRoleMembers from "../rm.mjs"
import fs from "fs"

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

    fs.writeFileSync(`./admin_perm/${interaction.guild.name}.json`, JSON.stringify(gp));

    const success = async (interaction) => {
        await interaction.followUp({ content: `Successfully granted admin permission.`, ephemeral: true });
    };
    const error = async (interaction) => {
        await interaction.followUp({ content: errMessage, ephemeral: true });
    };

    return { success, error, ok }
}