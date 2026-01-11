import fs from "fs";
import getRoleMembers from "../rm.mjs"

export default async function revoke_admin(interaction, amr, amu, gp) {
    // To do: work on this function (prob fork from grant_admin)
    let errMessage;
    let ok = true;
    if(amr) {
        for(const r of amr) {
            const uidInR = await getRoleMembers(interaction.guild, "fetch", r)
            if(uidInR.length === 0){
                errMessage = `Role ${r} does not exist in this server.`
                ok = false;
                break;
            } else if (!gp.permitted.roles.includes(r)) {
                errMessage = `Role ${r} does not have admin permission granted.`
                ok = false;
                break;
            }
            gp.permitted.roles.splice(gp.permitted.roles.indexOf(r), 1);
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
            gp.permitted.users.splice(gp.permitted.users.indexOf(the_user.first().user.id), 1);
        }
    }

    fs.writeFileSync(`./admin_perm/${interaction.guild.name}.json`, JSON.stringify(gp));

    const success = async (interaction) => {
        await interaction.followUp({ content: `Successfully revoked admin permission.`, ephemeral: true });
    };
    const error = async (interaction) => {
        await interaction.followUp({ content: errMessage, ephemeral: true });
    };

    return { success, error, ok }
}