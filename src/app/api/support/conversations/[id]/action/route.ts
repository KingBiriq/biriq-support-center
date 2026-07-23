import { NextRequest, NextResponse } from "next/server";
import { verifySupportSession } from "@/lib/supportAuth";
import { requirePermission, logAuditAction } from "@/lib/support/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import { apiSuccess, apiError } from "@/lib/api-utils";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await verifySupportSession();
    if (!session) return apiError("UNAUTHORIZED", "Unauthorized", 401);

    const { id } = params;
    const body = await req.json();
    const { action, payload } = body;

    const allowedActions = [
      'assign', 'unassign', 'transfer', 'resolve', 'close', 'reopen', 
      'snooze', 'spam', 'set_priority', 'mark_read', 'mark_unread',
      'add_tag', 'remove_tag', 'link_order', 'unlink_order', 
      'link_payment', 'unlink_payment', 'ai_takeover', 'return_to_ai'
    ];

    if (!allowedActions.includes(action)) {
      return apiError("BAD_REQUEST", `Invalid action. Allowed: ${allowedActions.join(', ')}`, 400);
    }

    const sAdmin = supabaseAdmin();
    let updates: any = {};
    let requiredPermission = 'conversations.reply'; // Default

    switch (action) {
      case 'assign':
        requiredPermission = 'conversations.assign';
        if (!payload?.agent_id) throw new Error("Missing agent_id");
        updates = { 
          assigned_agent_id: payload.agent_id === 'me' ? session.staffId : payload.agent_id, 
          status: 'open' 
        };
        break;
      case 'unassign':
        requiredPermission = 'conversations.assign';
        updates = { assigned_agent_id: null, status: 'open' };
        break;
      case 'transfer':
        requiredPermission = 'conversations.assign';
        if (!payload?.team_id) throw new Error("Missing team_id");
        updates = { team_id: payload.team_id, assigned_agent_id: null, status: 'open' };
        break;
      case 'resolve':
        requiredPermission = 'conversations.resolve';
        updates = { status: 'resolved', resolved_at: new Date().toISOString() };
        break;
      case 'close':
        requiredPermission = 'conversations.resolve';
        updates = { status: 'closed', closed_at: new Date().toISOString() };
        
        // Auto-send CSAT Rating prompt message to customer
        try {
          const csatMsg = "Sheekadiinii waa la xiray. Fadlan qiimee adeegayaga shaqada (1-5 Stars):\n\n⭐️⭐️⭐️⭐️⭐️ (5 - aad u wanaagsan)\n⭐️⭐️⭐️⭐️ (4 - Wanaagsan)\n⭐️⭐️⭐️ (3 - Caadi)\n⭐️⭐️ (2 - Liita)\n⭐️ (1 - Aad u liita)";
          await sAdmin.from("support_messages").insert({
            conversation_id: id,
            channel_type: "website",
            sender_type: "system",
            direction: "outbound",
            body: csatMsg,
            status: "delivered"
          });
        } catch(e) { console.error("Failed to send CSAT message:", e); }
        break;
      case 'reopen':
        requiredPermission = 'conversations.reply';
        updates = { status: 'open', resolved_at: null, closed_at: null };
        break;
      case 'snooze':
        requiredPermission = 'conversations.reply';
        if (!payload?.until) throw new Error("Missing snooze until date");
        updates = { status: 'snoozed', snoozed_until: payload.until };
        break;
      case 'spam':
        requiredPermission = 'conversations.resolve';
        updates = { status: 'spam' };
        break;
      case 'set_priority':
        requiredPermission = 'conversations.reply';
        updates = { priority: payload.priority || 'medium' };
        break;
      case 'mark_read':
        requiredPermission = 'conversations.view';
        updates = { unread_count: 0 };
        break;
      case 'mark_unread':
        requiredPermission = 'conversations.view';
        updates = { unread_count: 1 };
        break;
      case 'add_tag':
        requiredPermission = 'conversations.reply';
        if (!payload?.tag_id) throw new Error("Missing tag_id");
        await sAdmin.from('support_conversation_tags').insert({ conversation_id: id, tag_id: payload.tag_id });
        break;
      case 'remove_tag':
        requiredPermission = 'conversations.reply';
        if (!payload?.tag_id) throw new Error("Missing tag_id");
        await sAdmin.from('support_conversation_tags').delete().match({ conversation_id: id, tag_id: payload.tag_id });
        break;
      case 'link_order':
        requiredPermission = 'conversations.reply';
        if (!payload?.order_id) throw new Error("Missing order_id");
        await sAdmin.from('support_conversation_orders').insert({ conversation_id: id, existing_order_id: payload.order_id, linked_by: session.staffId });
        break;
      case 'unlink_order':
        requiredPermission = 'conversations.reply';
        if (!payload?.order_id) throw new Error("Missing order_id");
        await sAdmin.from('support_conversation_orders').delete().match({ conversation_id: id, existing_order_id: payload.order_id });
        break;
      case 'link_payment':
        requiredPermission = 'conversations.reply';
        if (!payload?.payment_id) throw new Error("Missing payment_id");
        await sAdmin.from('support_conversation_payments').insert({ conversation_id: id, existing_payment_id: payload.payment_id, linked_by: session.staffId });
        break;
      case 'unlink_payment':
        requiredPermission = 'conversations.reply';
        if (!payload?.payment_id) throw new Error("Missing payment_id");
        await sAdmin.from('support_conversation_payments').delete().match({ conversation_id: id, existing_payment_id: payload.payment_id });
        break;
      case 'ai_takeover':
        requiredPermission = 'conversations.reply';
        updates = { ai_status: 'human_takeover' };
        await sAdmin.from('support_messages').insert({
          conversation_id: id,
          sender_type: 'system',
          body: `Agent took over the conversation from AI.`,
          is_internal: true
        });
        break;
      case 'return_to_ai':
        requiredPermission = 'conversations.reply';
        updates = { ai_status: 'ai_active' };
        await sAdmin.from('support_messages').insert({
          conversation_id: id,
          sender_type: 'system',
          body: `Conversation returned to AI handling.`,
          is_internal: true
        });
        break;
    }

    await requirePermission(session.staffId, requiredPermission as any);

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      const { error } = await sAdmin.from('support_conversations').update(updates).eq('id', id);
      if (error) throw error;
    }

    await logAuditAction(session.staffId, `conversation.${action}`, { conversation_id: id, payload });

    return apiSuccess({ action, success: true });
  } catch (error: any) {
    if (error.message.includes('Forbidden')) return apiError("FORBIDDEN", error.message, 403);
    return apiError("INTERNAL_ERROR", error.message, 500);
  }
}
