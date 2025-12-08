import getRoleMembers from "../rm.mjs"

export default async function _addmin(interaction, amr, amu, gp) {
    const gms = await interaction.guild.members.fetch()
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
            gp.concat(uidInR);
        } 
    }
    if(amu) {
        for(const u of amu) {
            if(!gms.filter(gm => gm.user.username === u)){
                errMessage = `User ${u} does not exist in this server.`
                ok = false;
                break;
            }
            gp.push(u);
        }
    }

    const success = async (interaction) => {
        interaction.followUp({ content: `Cleared ${deleted_amount} messages.`, ephemeral: true });
    };
    const error = async (interaction) => {
        interaction.followUp({ content: errMessage, ephemeral: true });
    };

    return { success, error, ok }
}