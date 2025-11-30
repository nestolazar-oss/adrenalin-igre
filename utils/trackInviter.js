import { AuditLogEvent } from "discord.js";

/**
 * Praćenje ko je pozvao člana preko invite-a.
 */
export async function trackInviter(member, client) {
    try {
        const guild = member.guild;

        const logs = await guild.fetchAuditLogs({
            type: AuditLogEvent.InviteCreate,
            limit: 1
        });

        const entry = logs.entries.first();
        if (!entry) return null;

        const inviter = entry.executor;

        // DEBUG
        console.log(`[INVITE TRACKER] ${member.user.tag} invited by ${inviter?.tag || "unknown"}`);

        return inviter?.id || null;

    } catch (err) {
        console.error("Invite tracker error:", err);
        return null;
    }
}
