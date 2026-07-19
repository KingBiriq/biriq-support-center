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
    const s = supabaseAdmin();
    
    const { data: conv, error: convErr } = await s
        .from('support_conversations')
        .update({
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            resolved_by: session.staffId,
            updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
        .select('id, status')
        .single();

    if (convErr) return apiError("NOT_FOUND", "Conversation not found", 404);

    await logAuditAction(session.staffId, 'conversation.resolved', { conversation_id: conversationId });
    
    return apiSuccess({ status: conv.status });
  } catch (error: any) {
    if (error.message.includes('Forbidden')) return apiError("FORBIDDEN", error.message, 403);
    return apiError("INTERNAL_ERROR", error.message, 500);
  }
}
