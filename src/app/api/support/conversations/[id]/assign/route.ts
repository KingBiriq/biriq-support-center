import { NextRequest, NextResponse } from "next/server";
import { verifySupportSession } from "@/lib/supportAuth";
import { requirePermission, logAuditAction } from "@/lib/support/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import { apiSuccess, apiError } from "@/lib/api-utils";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await verifySupportSession();
    if (!session) return apiError("UNAUTHORIZED", "Unauthorized", 401);

    await requirePermission(session.staffId, 'conversations.manage');

    const conversationId = params.id;
    const body = await req.json();
    let { staff_id } = body; // can be null to unassign

    if (!staff_id || staff_id === 'me') {
        staff_id = session.staffId;
    }

    const s = supabaseAdmin();
    
    const { data: conv, error: convErr } = await s
        .from('support_conversations')
        .update({
            assigned_to: staff_id,
            updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
        .select('id, assigned_to')
        .single();

    if (convErr) return apiError("NOT_FOUND", "Conversation not found", 404);

    await logAuditAction(session.staffId, 'conversation.assigned', { conversation_id: conversationId, assigned_to: staff_id });

    // Note: To implement automated assignment based on load, we would add that logic here if staff_id is "auto".
    
    return apiSuccess({ assigned_to: conv.assigned_to });
  } catch (error: any) {
    if (error.message.includes('Forbidden')) return apiError("FORBIDDEN", error.message, 403);
    return apiError("INTERNAL_ERROR", error.message, 500);
  }
}
