import { supabaseAdmin } from "@/lib/supabase";

/**
 * Automatically assigns a conversation to the available staff member with the lowest load.
 */
export async function autoAssignConversation(conversationId: string) {
    const s = supabaseAdmin();

    // 1. Get all active staff (For a real production app, we would filter by 'is_online' presence)
    const { data: staff, error: staffErr } = await s
        .from('support_staff_profiles')
        .select('id')
        .eq('account_status', 'active');

    if (staffErr || !staff || staff.length === 0) {
        console.warn("No active staff available for assignment");
        return null;
    }

    // 2. Get current loads for each active staff
    // Because Supabase rpc/group by might be complex, we can just fetch open convos
    const { data: convos, error: convErr } = await s
        .from('support_conversations')
        .select('assigned_agent_id')
        .eq('status', 'open')
        .not('assigned_agent_id', 'is', null);

    if (convErr) {
        console.error("Error fetching conversation loads", convErr);
        return null;
    }

    const loads: Record<string, number> = {};
    staff.forEach(s => loads[s.id] = 0);
    
    if (convos) {
        convos.forEach(c => {
            if (c.assigned_agent_id && loads[c.assigned_agent_id] !== undefined) {
                loads[c.assigned_agent_id]++;
            }
        });
    }

    // 3. Find staff with minimum load
    let minLoadStaffId = staff[0].id;
    let minLoad = loads[minLoadStaffId];

    for (const s of staff) {
        if (loads[s.id] < minLoad) {
            minLoad = loads[s.id];
            minLoadStaffId = s.id;
        }
    }

    // 4. Assign
    const { error: assignErr } = await s
        .from('support_conversations')
        .update({ assigned_agent_id: minLoadStaffId, updated_at: new Date().toISOString() })
        .eq('id', conversationId);

    if (assignErr) {
        console.error("Failed to auto-assign", assignErr);
        return null;
    }

    return minLoadStaffId;
}
